import requests
with open("tmp_test.pdf", "wb") as f: f.write(b"fake")
r = requests.post("http://localhost:3001/api/v1/payslips/process", files={"pdfFile": open("tmp_test.pdf", "rb")}, data={"unidade": "Gravataí", "subject": "Teste", "message": "Olá {{nome}}"})
print(r.status_code, r.json())
