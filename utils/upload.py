#!/usr/bin/env python3

import argparse
import http.client
import httplib2
import os
import random
import sys
import time
import pickle

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Explicitly tell the underlying HTTP transport library not to retry, since
# we are handling retry logic ourselves.
# httplib2.RETRIES = 1 # Note: httplib2 might not be directly used by the new library's transport

# Maximum number of times to retry before giving up.
MAX_RETRIES = 10

# Always retry when these exceptions are raised.
# Updated for Python 3 and google-api-python-client
RETRIABLE_EXCEPTIONS = (
    httplib2.HttpLib2Error,  # Keep if httplib2 is still used under the hood
    IOError,  # Generally replaced by OSError in Python 3
    OSError,
    http.client.NotConnected,
    http.client.IncompleteRead,
    http.client.ImproperConnectionState,
    http.client.CannotSendRequest,
    http.client.CannotSendHeader,
    http.client.ResponseNotReady,
    http.client.BadStatusLine,
)

# Always retry when an apiclient.errors.HttpError with one of these status
# codes is raised.
RETRIABLE_STATUS_CODES = [500, 502, 503, 504]

# The CLIENT_SECRETS_FILE variable specifies the name of a file that contains
# the OAuth 2.0 information for this application, including its client_id and
# client_secret. You can acquire an OAuth 2.0 client ID and client secret from
# the Google API Console at
# https://console.cloud.google.com/.
# Please ensure that you have enabled the YouTube Data API for your project.
CLIENT_SECRETS_FILE = ".secrets/google_client_secret.json"
TOKEN_PICKLE_FILE = ".secrets/token.pickle"  # Store credentials securely

# This OAuth 2.0 access scope allows an application to upload files to the
# authenticated user's YouTube channel, but doesn't allow other types of access.
YOUTUBE_UPLOAD_SCOPE = ["https://www.googleapis.com/auth/youtube.upload"]
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

VALID_PRIVACY_STATUSES = ("public", "private", "unlisted")


def get_authenticated_service():
    credentials = None
    # The file token.pickle stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists(TOKEN_PICKLE_FILE):
        with open(TOKEN_PICKLE_FILE, "rb") as token:
            credentials = pickle.load(token)

    # If there are no (valid) credentials available, let the user log in.
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())
            except Exception as e:
                print(f"Error refreshing token: {e}")
                # Fallback to re-running the flow
                flow = InstalledAppFlow.from_client_secrets_file(
                    CLIENT_SECRETS_FILE, scopes=YOUTUBE_UPLOAD_SCOPE
                )
                # Use http://localhost:0/ to automatically pick an available port
                credentials = flow.run_local_server(port=0)
        else:
            if not os.path.exists(CLIENT_SECRETS_FILE):
                print(f"Missing client secrets file: {CLIENT_SECRETS_FILE}")
                print(
                    f"Please download your client secrets file from the Google API Console and place it as {CLIENT_SECRETS_FILE}"
                )
                sys.exit(0)

            flow = InstalledAppFlow.from_client_secrets_file(
                CLIENT_SECRETS_FILE, scopes=YOUTUBE_UPLOAD_SCOPE
            )
            credentials = flow.run_local_server(
                port=9999, open_browser=False,
                authorization_prompt_message="{url}",
                # redirect_uri=f"http://localhost:9999/"
            ) # Use run_console() for non-GUI environments if needed

        # Save the credentials for the next run
        with open(TOKEN_PICKLE_FILE, "wb") as token:
            pickle.dump(credentials, token)
            print(f"Credentials saved to {TOKEN_PICKLE_FILE}")

    return build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION, credentials=credentials)


def initialize_upload(youtube, options):
    tags = None
    if options.keywords:
        tags = options.keywords.split(",")

    body = dict(
        snippet=dict(
            title=options.title,
            description=options.description,
            tags=tags,
            categoryId=options.category,
        ),
        status=dict(privacyStatus=options.privacyStatus),
    )

    # Call the API's videos.insert method to create and upload the video.
    media_body = MediaFileUpload(options.file, chunksize=-1, resumable=True)

    insert_request = youtube.videos().insert(
        part=",".join(body.keys()), body=body, media_body=media_body
    )

    resumable_upload(insert_request)


# This method implements an exponential backoff strategy to resume a
# failed upload.
def resumable_upload(request):
    response = None
    error = None
    retry = 0
    while response is None:
        try:
            print("Uploading file...")
            status, response = request.next_chunk()
            if response is not None:
                if "id" in response:
                    print(f"Video id '{response['id']}' was successfully uploaded.")
                else:
                    print(f"The upload failed with an unexpected response: {response}")
                    sys.exit(1)  # Exit with error code
        except HttpError as e:
            if e.resp.status in RETRIABLE_STATUS_CODES:
                error = f"A retriable HTTP error {e.resp.status} occurred:\n{e.content}"
            else:
                print(
                    f"An non-retriable HTTP error {e.resp.status} occurred:\n{e.content}"
                )
                raise  # Re-raise the error if it's not retriable
        except tuple(
            list(RETRIABLE_EXCEPTIONS) + [http.client.HTTPException]
        ) as e:  # Add base HTTPException
            error = f"A retriable error occurred: {e}"

        if error is not None:
            print(error)
            retry += 1
            if retry > MAX_RETRIES:
                print("No longer attempting to retry.")
                sys.exit(1)  # Exit with error code

            max_sleep = 2**retry
            sleep_seconds = random.random() * max_sleep
            print(f"Sleeping {sleep_seconds:.2f} seconds and then retrying...")
            time.sleep(sleep_seconds)
            error = None  # Reset error before next retry


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upload video to YouTube.")
    parser.add_argument("--file", required=True, help="Video file to upload")
    parser.add_argument("--title", help="Video title", default="Test Title")
    parser.add_argument(
        "--description", help="Video description", default="Test Description"
    )
    parser.add_argument(
        "--category",
        default="22",  # Default category ID (e.g., People & Blogs)
        help="Numeric video category. See https://developers.google.com/youtube/v3/docs/videoCategories/list",
    )
    parser.add_argument(
        "--keywords", help="Video keywords, comma separated", default=""
    )
    parser.add_argument(
        "--privacyStatus",
        choices=VALID_PRIVACY_STATUSES,
        default=VALID_PRIVACY_STATUSES[0],  # Default to public
        help="Video privacy status.",
    )
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(
            f"Error: Please specify a valid file using the --file parameter. File not found: {args.file}"
        )
        sys.exit(1)

    # Check for client secrets file early
    if not os.path.exists(CLIENT_SECRETS_FILE):
        print(f"Error: Missing client secrets file: {CLIENT_SECRETS_FILE}")
        print(
            "Please download your OAuth 2.0 client secrets from the Google API Console"
        )
        print(
            "and save it as 'client_secrets.json' in the same directory as this script."
        )
        sys.exit(1)

    youtube = get_authenticated_service()
    try:
        initialize_upload(youtube, args)
    except HttpError as e:
        print(f"An HTTP error {e.resp.status} occurred:\n{e.content}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)
