const express = require('express');
const app = express();
const PORT = 10000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});