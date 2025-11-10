import requests
data = {"unidade": "Nova Prata", "dryRun": "true"}
r = requests.post("http://localhost:3001/api/v1/payslips/process", data=data)
print(r.status_code, r.json())
