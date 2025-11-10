import requests
files = {"pdfFile": ("pack.pdf", open("tmp/holerite-novaprata.pdf", "rb"), "application/pdf")}
data = {"unidade": "Nova Prata", "subject": "Holerite", "message": "Olá {{nome}} de {{unidade}}.", "testRecipient": "seu.email@dominio.com"}
r = requests.post("http://localhost:3001/api/v1/payslips/process", files=files, data=data)
print(r.status_code, r.json())
