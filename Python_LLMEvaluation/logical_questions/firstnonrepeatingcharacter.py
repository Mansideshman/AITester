text = "aabbcdd"

char_count = {}

for char in text:
    if char in char_count:
        char_count[char] += 1
    else:
        char_count[char] = 1

for char in text:
    if char_count[char] == 1:
        print(char)
        break 