import requests

url = "http://localhost:3001/api/v1/payslips/process"

# Forçar mimetype explícito no cabeçalho
files = {
    'pdfFile': ('holerite-teste.pdf', open(r'.\tmp\holerite-teste.pdf', 'rb'), 'application/pdf')
}

data = {
  'unidade': 'Nova Prata',
  'subject': 'Holerite Teste - envio único',
  'message': 'Teste real para validação.',
  'dryRun': 'false',
  'testRecipient': 'seu.email@dominio.com'
}

print(" Enviando requisição...")
print(f"   URL: {url}")
print(f"   Unidade: {data['unidade']}")
print(f"   Mimetype: application/pdf (explícito)")

response = requests.post(url, files=files, data=data)

print(f"\n📥 Status: {response.status_code}")

if response.status_code == 200:
    import json
    print("\n✅ SUCESSO!")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
else:
    print(f"\n❌ ERRO: {response.status_code}")
    print(response.text[:500])