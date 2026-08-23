# 用 git credential 中已存的 GitHub 凭证查询 Actions 运行状态（token 不落盘、不打印）
import json
import subprocess
import urllib.request

out = subprocess.run(
    ["git", "credential", "fill"],
    input="protocol=https\nhost=github.com\n\n",
    capture_output=True,
    text=True,
    cwd=r"D:\Desktop\Project\Project\Smart-Classroom-Workshop",
).stdout

creds = dict(line.split("=", 1) for line in out.strip().splitlines() if "=" in line)
token = creds.get("password", "")
if not token:
    print("NO_TOKEN: credential manager 中没有 GitHub 凭证")
    raise SystemExit(1)

proxy = urllib.request.ProxyHandler({
    "http": "http://127.0.0.1:7897",
    "https": "http://127.0.0.1:7897",
})
opener = urllib.request.build_opener(proxy)
url = "https://api.github.com/repos/AzureDestiny346/smart-classroom-workshop/actions/runs?per_page=3"
req = urllib.request.Request(url, headers={
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "ci-check",
})
with opener.open(req, timeout=30) as resp:
    data = json.load(resp)

for r in data.get("workflow_runs", []):
    print(f"run={r['id']} sha={r['head_sha'][:7]} status={r['status']} conclusion={r['conclusion']} workflow={r['name']} event={r['event']}")
if not data.get("workflow_runs"):
    print("NO_RUNS: 推送后还没有 workflow 运行记录")
    raise SystemExit(0)

# 展开最新 run 的每个 job / step 结论
latest = data["workflow_runs"][0]
jobs_url = f"https://api.github.com/repos/AzureDestiny346/smart-classroom-workshop/actions/runs/{latest['id']}/jobs"
req2 = urllib.request.Request(jobs_url, headers={
    "Authorization": f"Bearer {token}",
    "User-Agent": "ci-check",
})
with opener.open(req2, timeout=30) as resp2:
    jobs = json.load(resp2)
print(f"\n===== 最新 run {latest['id']} ({latest['head_sha'][:7]}) 步骤明细 =====")
for job in jobs.get("jobs", []):
    print(f"JOB: {job['name']} -> {job['conclusion'] or job['status']}")
    for step in job.get("steps", []):
        print(f"  {(step['conclusion'] or step['status']):>10}  {step['name']}")
    # 失败步骤拉取错误日志片段
    if job["conclusion"] == "failure":
        for step in job.get("steps", []):
            if step["conclusion"] == "failure":
                print(f"\n----- 失败步骤 [{step['name']}] 日志尾部 -----")
                log_url = f"https://api.github.com/repos/AzureDestiny346/smart-classroom-workshop/actions/jobs/{job['id']}/logs"
                req3 = urllib.request.Request(log_url, headers={
                    "Authorization": f"Bearer {token}",
                    "User-Agent": "ci-check",
                })
                try:
                    with opener.open(req3, timeout=30) as resp3:
                        log = resp3.read().decode("utf-8", errors="replace")
                    for line in log.splitlines()[-40:]:
                        print(line)
                except Exception as e:  # noqa: BLE001 - 日志下载失败不应中断诊断
                    print(f"(日志下载失败: {e})")
                break
