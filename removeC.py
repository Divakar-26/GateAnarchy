import os
import re

def remove_comments_from_js(code):
    pattern = r"""
        //.*?$                              # single-line comments
        |                                   # OR
        /\*.*?\*/                           # multi-line comments
        |                                   # OR (keep strings safe)
        "(?:\\.|[^"\\])*"                   # double-quoted strings
        |                                   # OR
        '(?:\\.|[^'\\])*'                   # single-quoted strings
        |                                   # OR
        `(?:\\.|[^`\\])*`                   # template literals
    """

    def replacer(match):
        s = match.group(0)
        # If it's a comment → remove it
        if s.startswith('/') or s.startswith('/*'):
            return ''
        return s  # keep strings

    return re.sub(pattern, replacer, code, flags=re.MULTILINE | re.DOTALL | re.VERBOSE)


def process_folder(folder_path, output_folder=None):
    if output_folder:
        os.makedirs(output_folder, exist_ok=True)

    for root, _, files in os.walk(folder_path):
        for file in files:
            if file.endswith(('.js', '.jsx')):
                input_path = os.path.join(root, file)

                with open(input_path, 'r', encoding='utf-8') as f:
                    code = f.read()

                cleaned_code = remove_comments_from_js(code)

                # Decide where to save
                if output_folder:
                    rel_path = os.path.relpath(root, folder_path)
                    save_dir = os.path.join(output_folder, rel_path)
                    os.makedirs(save_dir, exist_ok=True)
                    output_path = os.path.join(save_dir, file)
                else:
                    output_path = input_path  # overwrite

                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(cleaned_code)

                print(f"Processed: {input_path}")


if __name__ == "__main__":
    folder = input("Enter folder path: ").strip()
    
    # Optional: output folder (leave empty to overwrite)
    output = input("Enter output folder (leave blank to overwrite): ").strip()
    output = output if output else None

    process_folder(folder, output)
