import requests
files = {"pdfFile": ("pack.pdf", open("tmp/holerite-novaprata.pdf", "rb"), "application/pdf")}
data = {"unidade": "Nova Prata", "subject": "Holerite Nov/2025", "message": "Olá {{nome}}, segue holerite.", "confirm": "YES", "batchSize": "10"}
r = requests.post("http://localhost:3001/api/v1/payslips/process", files=files, data=data)
print(r.status_code, r.json())
