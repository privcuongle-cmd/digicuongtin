import os
import re

def find_missing_camera_imports():
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                    if 'Camera' in content:
                        # Check if it's used as a component or variable
                        # But not in a string or comment
                        # This is just a rough check
                        if '<Camera' in content:
                            if 'import' not in content or 'Camera' not in content.split('import')[1].split('from')[0]:
                                print(f"Potential missing import in {path}")

if __name__ == "__main__":
    find_missing_camera_imports()
