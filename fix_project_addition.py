import subprocess
import json
import time

PROJECT_NUMBER = "1"
PROJECT_ID = "PVT_kwHOEFdtiM4BT6mR"
OWNER = "dev0nyn"
REPO = "dev0nyn/it-management-system"
STATUS_FIELD_ID = "PVTSSF_lAHOEFdtiM4BT6mRzhBGOEU"
READY_OPTION_ID = "61e4505c"

# Range of issue numbers I just created
issue_numbers = list(range(30, 56))

def run_cmd(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running command: {' '.join(cmd)}")
        print(f"Stdout: {result.stdout}")
        print(f"Stderr: {result.stderr}")
        return None
    return result.stdout

def add_to_project(issue_url):
    cmd = [
        "gh", "project", "item-add", PROJECT_NUMBER,
        "--owner", OWNER,
        "--url", issue_url,
        "--format", "json"
    ]
    output = run_cmd(cmd)
    if output:
        data = json.loads(output)
        item_id = data.get("id")
        print(f"Added {issue_url} to project, item ID: {item_id}")
        return item_id
    return None

def set_status_ready(item_id):
    cmd = [
        "gh", "project", "item-edit",
        "--id", item_id,
        "--field-id", STATUS_FIELD_ID,
        "--project-id", PROJECT_ID,
        "--single-select-option-id", READY_OPTION_ID
    ]
    run_cmd(cmd)
    print(f"Status set to Ready for item {item_id}")

def main():
    for num in issue_numbers:
        issue_url = f"https://github.com/{REPO}/issues/{num}"
        item_id = add_to_project(issue_url)
        if item_id:
            set_status_ready(item_id)
        time.sleep(1)

if __name__ == "__main__":
    main()
