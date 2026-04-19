# Industrial SaaS Bancadas - Relatório de Entrega (V3.0.0)

Este documento consolida o estado final da infraestrutura e as regras de negócio para manutenção futura.

## 1. Versão do Motor (V3.0.0)
- **Dashboard**: Next.js com carregamento padrão de "Tudo" (All) para visibilidade imediata dos 341.676 registros.
- **SQL View**: `global_uniao` v10.0 (Master Correlation).
- **Sincronizador**: `sync_bridge.py` v12.0 (Schema-Aware).

## 2. Regras de Relacionamento (Crucial)
O sistema foi blindado com as seguintes pontes de dados:
| Origem | Destino | Chave de Ligação | Motivo |
| :--- | :--- | :--- | :--- |
| **Data** | **Full Data** | `ID Mark` | Relaciona o ensaio com os dados técnicos de sensores. |
| **Data** | **Relatorio.csv** | `Meter Number` -> `Lote` | Relaciona o medidor físico com os dados comerciais/lote. |

## 3. Estrutura do Banco de Dados (SQL View v10.0)
A View `global_uniao` realiza:
- **Extração Técnica**: Mineira o JSON para exibir `Qmax`, `Qmin`, `Qn` e `Perda de Carga` em colunas separadas.
- **Aliasing**: Traduz `Save time` para `data_hora` e `Meter Number` para `meter_number` para compatibilidade total com o dashboard.

## 4. Manutenção e Infraestrutura
- **PIN Administrativo**: `1234`.
- **Configurações**: Gerenciadas via `app_config`, permitindo alterar caminhos de bancos de dados locais diretamente pela interface.
- **Sincronismo**: O script local utiliza `bancada_id` + `ID Mark` para gerar o `composite_id`, evitando duplicação entre diferentes bancadas na nuvem.

---
*Relatório gerado em 19/04/2026 para sucessão e apresentação ao setor.*
