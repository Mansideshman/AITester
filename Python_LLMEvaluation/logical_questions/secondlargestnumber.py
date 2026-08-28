numbers = [10,20,5,40,30]

largest = numbers[0]
second_largest = numbers[0]

for num in numbers:
    if num > largest:
        second_largest = largest
        largest = num
    elif  num>second_largest and num != largest:
        second_largest = num
print(second_largest)