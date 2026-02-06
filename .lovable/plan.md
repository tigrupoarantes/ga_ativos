

# Plano: Atualizar Emails dos Funcionários por CPF

## Resumo

Executar atualização em massa dos emails de funcionários diretamente no banco de dados, usando o CPF como chave de identificação.

## Dados da Planilha

Extraídos 97 registros da planilha `Email_Vend_BRK.xlsx`:

| Total de Registros | Formato Email |
|--------------------|---------------|
| 97 | XXX@brkarantes.com.br |

## Verificação no Banco

A consulta identificou que a maioria dos CPFs da planilha existe na tabela `funcionarios` com `active = true`. Muitos funcionários atualmente não têm email cadastrado (`null`).

## Execução

Serão executados comandos SQL UPDATE para cada CPF, atualizando o campo `email`:

```sql
UPDATE funcionarios SET email = 'XXX@brkarantes.com.br', updated_at = now()
WHERE cpf = 'XXXXXXXXXXX' AND active = true;
```

### Lista Completa de Atualizações (97 registros)

| CPF | Email |
|-----|-------|
| 40053011856 | 102@brkarantes.com.br |
| 16400234888 | 105@brkarantes.com.br |
| 37997234802 | 109@brkarantes.com.br |
| 47141884882 | 124@brkarantes.com.br |
| 26743535893 | 125@brkarantes.com.br |
| 40450935833 | 130@brkarantes.com.br |
| 41604904844 | 131@brkarantes.com.br |
| 46603997886 | 132@brkarantes.com.br |
| 36175732820 | 133@brkarantes.com.br |
| 14153216801 | 202@brkarantes.com.br |
| 11907799869 | 204@brkarantes.com.br |
| 16222055885 | 214@brkarantes.com.br |
| 28731315860 | 220@brkarantes.com.br |
| 16401054840 | 231@brkarantes.com.br |
| 27744414802 | 234@brkarantes.com.br |
| 40284720836 | 236@brkarantes.com.br |
| 47845560871 | 237@brkarantes.com.br |
| 43065080800 | 238@brkarantes.com.br |
| 45292789801 | 239@brkarantes.com.br |
| 51271306883 | 240@brkarantes.com.br |
| 44822053890 | 301@brkarantes.com.br |
| 35587513882 | 303@brkarantes.com.br |
| 25078111883 | 304@brkarantes.com.br |
| 38258705881 | 305@brkarantes.com.br |
| 18773149861 | 306@brkarantes.com.br |
| 32311475819 | 309@brkarantes.com.br |
| 29352526830 | 311@brkarantes.com.br |
| 35799210883 | 321@brkarantes.com.br |
| 45553974879 | 328@brkarantes.com.br |
| 34381952839 | 338@brkarantes.com.br |
| 39972731898 | 340@brkarantes.com.br |
| 36629755804 | 402@brkarantes.com.br |
| 40115608800 | 431@brkarantes.com.br |
| 13670976817 | 504@brkarantes.com.br |
| 38775098865 | 505@brkarantes.com.br |
| 22362079805 | 511@brkarantes.com.br |
| 28887602824 | 512@brkarantes.com.br |
| 29141776828 | 519@brkarantes.com.br |
| 32273794819 | 520@brkarantes.com.br |
| 18087667840 | 522@brkarantes.com.br |
| 32825928844 | 523@brkarantes.com.br |
| 36812857807 | 524@brkarantes.com.br |
| 43247968822 | 525@brkarantes.com.br |
| 45859897812 | 526@brkarantes.com.br |
| 39884234833 | 527@brkarantes.com.br |
| 94964912604 | 615@brkarantes.com.br |
| 10528147862 | 618@brkarantes.com.br |
| 05610115833 | 619@brkarantes.com.br |
| 38754616816 | 620@brkarantes.com.br |
| 50439586852 | 621@brkarantes.com.br |
| 36529511822 | 622@brkarantes.com.br |
| 24872613821 | 623@brkarantes.com.br |
| 37697813840 | 625@brkarantes.com.br |
| 45906689800 | 627@brkarantes.com.br |
| 43779218860 | 628@brkarantes.com.br |
| 38455271884 | 630@brkarantes.com.br |
| 45542029841 | 701@brkarantes.com.br |
| 42236683820 | 702@brkarantes.com.br |
| 42841449874 | 703@brkarantes.com.br |
| 41283787806 | 800@brkarantes.com.br |
| 49907179884 | 801@brkarantes.com.br |
| 32844459862 | 802@brkarantes.com.br |
| 02044644126 | 803@brkarantes.com.br |
| 13885158817 | 805@brkarantes.com.br |
| 28864801855 | 810@brkarantes.com.br |
| 47184007832 | 811@brkarantes.com.br |
| 22153451876 | 813@brkarantes.com.br |
| 43807890807 | 814@brkarantes.com.br |
| 30965185800 | 830@brkarantes.com.br |
| 38285803864 | 831@brkarantes.com.br |
| 22764239866 | 832@brkarantes.com.br |
| 30391797808 | 900@brkarantes.com.br |
| 32969638800 | 901@brkarantes.com.br |
| 21597097861 | 272001@brkarantes.com.br |
| 13881616802 | 272002@brkarantes.com.br |
| 30613020855 | 272003@brkarantes.com.br |
| 41524915823 | 272004@brkarantes.com.br |
| 30785720804 | 272005@brkarantes.com.br |
| 43680106807 | 272006@brkarantes.com.br |
| 39129857821 | 272007@brkarantes.com.br |
| 31404206841 | 272008@brkarantes.com.br |
| 21523184809 | 272009@brkarantes.com.br |
| 41738309800 | 272010@brkarantes.com.br |
| 21333679858 | 272013@brkarantes.com.br |
| 41600910831 | 272014@brkarantes.com.br |
| 29753437870 | 272015@brkarantes.com.br |
| 33228852830 | 272016@brkarantes.com.br |
| 44846449831 | 272018@brkarantes.com.br |
| 04967424856 | 272020@brkarantes.com.br |
| 49443831856 | 272021@brkarantes.com.br |
| 46690787800 | 272022@brkarantes.com.br |
| 22354634870 | 272023@brkarantes.com.br |
| 25714448839 | 272024@brkarantes.com.br |
| 33964120871 | 272026@brkarantes.com.br |
| 41462090800 | 272027@brkarantes.com.br |
| 42059016827 | 280154@brkarantes.com.br |

**Nota**: O CPF `39129857821` (Gabriel Oliveira Vaitkevicius) aparece 2 vezes na planilha com emails diferentes (272007 e 272017). Usarei o primeiro registro (272007@brkarantes.com.br).

## Método de Execução

Como a ferramenta de SQL read-only só permite SELECT, utilizarei a ferramenta de inserção/atualização de dados do Supabase para executar os UPDATEs em lotes.

## Resultado Esperado

- ~95 funcionários terão seu email atualizado
- Campo `updated_at` será atualizado para registrar a modificação
- CPFs não encontrados serão reportados

