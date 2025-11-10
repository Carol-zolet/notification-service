import requests

url = "http://localhost:3001/api/v1/payslips/process"

# Forçar mimetype explícito
files = {
    'pdfFile': ('holerite-teste.pdf', open(r'.\tmp\holerite-teste.pdf', 'rb'), 'application/pdf')
}

data = {
    'unidade': 'Nova Prata',
    'subject': 'Holerite Teste',
    'message': 'Teste de envio',
    'dryRun': 'true'
}

print(" Enviando requisição...")
print(f"   URL: {url}")
print(f"   Unidade: {data['unidade']}")
print(f"   Mimetype: application/pdf")

response = requests.post(url, files=files, data=data)

print(f"\n Resposta: {response.status_code}")
print(response.text)

if response.status_code == 200:
    import json
    print("\n✅ SUCESSO!")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
else:
    print("\n❌ FALHA - Verificar logs do servidor")
