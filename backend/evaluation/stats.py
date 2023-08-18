import json

with open('annotations.json', 'r') as annotations:
    data = json.load(annotations)

    total = 0

    for file in data:
        regions = data[file].keys()

        for region in regions:
            current = data[file][region]

            for index in current:
                # Total time in seconds containing regions of interest
                start = float(current[index]['start'])
                end = float(current[index]['end'])
                diff = end - start
                total += diff
    
    print(total)