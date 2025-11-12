#!/bin/bash
# Marca migration com falha como resolvida
npx prisma migrate resolve --applied 20251112013014_init || echo "Migration já foi resolvida ou não existe"
