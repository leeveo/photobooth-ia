import json
import csv
import os

# Define file paths
json_file_path = r'app/photobooth-ia/admin/components/styleTemplateDataCoifure.json'
csv_file_path = r'coiffure_styles_export.csv'

def convert_json_to_csv():
    try:
        # Check if JSON file exists
        if not os.path.exists(json_file_path):
            # Try absolute path fallback if running differently
            json_file_path_abs = os.path.join(os.getcwd(), 'app', 'photobooth-ia', 'admin', 'components', 'styleTemplateDataCoifure.json')
            if os.path.exists(json_file_path_abs):
                 print(f"Found at {json_file_path_abs}")
                 with open(json_file_path_abs, 'r', encoding='utf-8') as json_file:
                    data = json.load(json_file)
            else:
                print(f"Error: File not found at {json_file_path}")
                return
        else:
            # Read JSON data
            with open(json_file_path, 'r', encoding='utf-8') as json_file:
                data = json.load(json_file)

        # Prepare CSV file
        with open(csv_file_path, 'w', newline='', encoding='utf-8-sig') as csv_file:
            # Using semicolon delimiter which is often better for Excel in French/European locales
            writer = csv.writer(csv_file, delimiter=';') 
            
            # Write header
            headers = [
                'Collection ID',
                'Collection Name',
                'Collection Description',
                'Style Name',
                'Gender',
                'Style Key',
                'Style Description',
                'Prompt',
                'Preview Image',
                'Variations',
                'Type' # Added Type as it appeared in the file preview
            ]
            writer.writerow(headers)

            # Iterate through collections and styles
            count = 0
            for collection in data:
                col_id = collection.get('id', '')
                col_name = collection.get('name', '')
                col_desc = collection.get('description', '')
                
                styles = collection.get('styles', [])
                
                for style in styles:
                    # Handle potential newlines in prompt or description by replacing them
                    prompt = style.get('prompt', '').replace('\n', ' ').replace('\r', '')
                    desc = style.get('description', '').replace('\n', ' ').replace('\r', '')
                    
                    row = [
                        col_id,
                        col_name,
                        col_desc,
                        style.get('name', ''),
                        style.get('gender', ''),
                        style.get('style_key', ''),
                        desc,
                        prompt,
                        style.get('preview_image', ''),
                        style.get('variations', ''),
                        style.get('type', '') # Added Type
                    ]
                    writer.writerow(row)
                    count += 1
            
            print(f"Successfully exported {count} styles to {csv_file_path}")

    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    convert_json_to_csv()
