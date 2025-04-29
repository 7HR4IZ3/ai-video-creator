from datetime import datetime

def sort_natural_numbers():
    numbers = [x for x in range(1, 21)]

    odd_numbers = list(filter(lambda x: x % 2 == 1, numbers))

    print(*numbers)
    print(f"odd_numbers = {odd_numbers}")


def print_date():
    print(datetime.now().strftime("%H:%M:%S"))

def main():
    sort_natural_numbers()
    print_date()

if __name__ == "__main__":
    main()