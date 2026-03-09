import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 60,
    lineHeight: 1.5,
    color: "#000",
  },
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 20,
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 12,
  },
  clauseTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  paragraph: {
    marginBottom: 6,
    textAlign: "justify",
  },
  signatureSection: {
    marginTop: 40,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
  },
  signatureBlock: {
    width: "45%",
    alignItems: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000",
    width: "100%",
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    textAlign: "center",
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  dateCity: {
    textAlign: "center",
    marginTop: 30,
    marginBottom: 10,
  },
});

export interface ContratoComodatoCelularProps {
  funcionario: {
    nome: string;
    cpf: string;
    rg?: string | null;
    cidade?: string | null;
    endereco?: string | null;
    cargo?: string | null;
  };
  ativo: {
    modelo: string;
    imei: string | null;
    imei2?: string | null;
    chip_linha?: string | null;
  };
  dataAtribuicao: string;
  empresa?: {
    nome: string;
    cnpj?: string | null;
  };
}

function fmt(value: string | null | undefined, fallback = "_____________"): string {
  return value && value.trim() ? value.trim() : fallback;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ContratoComodatoCelularPDF({
  funcionario,
  ativo,
  dataAtribuicao,
  empresa,
}: ContratoComodatoCelularProps) {
  const nomeEmpresa = empresa?.nome ?? "DISTRIBUIDORA G4 ARANTES LTDA";
  const cnpjEmpresa = empresa?.cnpj ?? "47.577.408/0001-XX";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Título */}
        <Text style={styles.title}>
          Contrato de Comodato e Uso de Serviços de Telefonia
        </Text>

        {/* Introdução */}
        <Text style={styles.paragraph}>
          Pelo presente instrumento particular e, na melhor forma de direito, as
          partes a seguir qualificadas firmam o presente contrato de comodato,
          nos termos do disposto nos arts. 579 a 585 do Diploma Civil vigente,
          que se regerá pelas cláusulas e condições seguintes:
        </Text>

        {/* Cláusula Primeira */}
        <View style={styles.section}>
          <Text style={styles.clauseTitle}>Cláusula Primeira - Das Partes</Text>
          <Text style={styles.paragraph}>
            Firmam o presente instrumento, de um lado{" "}
            <Text style={styles.bold}>{nomeEmpresa}</Text>, Sociedade Empresária
            Limitada, inscrita no CNPJ/MF sob o nº{" "}
            <Text style={styles.bold}>{cnpjEmpresa}</Text>, estabelecida na
            cidade de Brodowski/SP, na Avenida Dom Luís do Amaral Mousinho, 4200,
            Galpão 2, doravante denominada somente{" "}
            <Text style={styles.bold}>COMODANTE</Text> e de outro,{" "}
            <Text style={styles.bold}>{fmt(funcionario.nome)}</Text>,{" "}
            {fmt(funcionario.cargo, "colaborador(a)")}, inscrito(a) no CPF/MF
            sob o nº <Text style={styles.bold}>{fmt(funcionario.cpf)}</Text> e RG
            nº <Text style={styles.bold}>{fmt(funcionario.rg)}</Text>, residente
            em <Text style={styles.bold}>{fmt(funcionario.cidade)}</Text>,{" "}
            <Text style={styles.bold}>{fmt(funcionario.endereco)}</Text>,
            doravante denominado(a) somente{" "}
            <Text style={styles.bold}>COMODATÁRIO</Text>.
          </Text>
        </View>

        {/* Cláusula Segunda */}
        <View style={styles.section}>
          <Text style={styles.clauseTitle}>Cláusula Segunda - Do Objeto</Text>
          <Text style={styles.paragraph}>
            O presente contrato tem por objetivo o empréstimo em comodato, de 01
            (um) <Text style={styles.bold}>{fmt(ativo.modelo)}</Text>, nº série
            IMEI 1:{" "}
            <Text style={styles.bold}>{fmt(ativo.imei)}</Text>
            {ativo.imei2 ? (
              <Text> e IMEI 2: <Text style={styles.bold}>{ativo.imei2}</Text></Text>
            ) : null}
            {ativo.chip_linha ? (
              <Text>
                {" "}com nº celular{" "}
                <Text style={styles.bold}>{ativo.chip_linha}</Text>
              </Text>
            ) : null}{" "}
            e demais acessórios necessários ao seu funcionamento, como: Carregador
            (fonte e cabo USB originais) e Capa protetora.
          </Text>

          <Text style={styles.paragraph}>
            a) o equipamento deverá ser utilizado única e exclusivamente a serviço
            da empresa, tendo em vista a atividade a ser exercida pelo
            comodatário;
          </Text>
          <Text style={styles.paragraph}>
            b) o comodatário é obrigado a conservar, como se seu próprio fosse, o
            aparelho e acessórios tidos em comodato, não podendo usá-la senão na
            prestação de serviços à COMODANTE, sendo certo que a utilização do
            referido equipamento para fins pessoais será objeto de penalizações,
            conforme rege inclusive no contrato de trabalho;
          </Text>
          <Text style={styles.paragraph}>
            c) o comodatário é responsável pela guarda, conservação e manutenção
            dos aparelhos e acessórios emprestados em comodato, sendo responsável
            pelas despesas que realizar nessa empreita, não podendo jamais
            cobrá-los da COMODANTE;
          </Text>
          <Text style={styles.paragraph}>
            d) é conferida ao COMODANTE a faculdade de vistoriar o equipamento
            objeto do comodato, a qualquer tempo, sem aviso prévio;
          </Text>
          <Text style={styles.paragraph}>
            e) o comodatário compromete-se a devolver o equipamento e respectivos
            acessórios no mesmo dia em que for comunicado ou que comunique o seu
            desligamento e/ou mudança de função, devendo estar em perfeito estado
            de funcionamento, considerando-se apenas o desgaste natural pelo uso
            normal;
          </Text>
          <Text style={styles.paragraph}>
            f) fica convencionado que se o equipamento e/ou acessórios for(em)
            danificado(s), ou inutilizado(s) por emprego inadequado (forma culposa
            ou dolosa), mau uso, negligência, imprudência ou extravio, em casos de
            dano ou perda do equipamento e/ou acessórios emprestados em comodato,
            fica a COMODANTE desde já autorizada a descontar o valor
            correspondente à reposição ou conserto do equipamento com desconto em
            folha de pagamento ou de suas verbas rescisórias.
          </Text>
        </View>

        {/* Cláusula Terceira */}
        <View style={styles.section}>
          <Text style={styles.clauseTitle}>Cláusula Terceira - Da Vigência</Text>
          <Text style={styles.paragraph}>
            O presente contrato vigorará por prazo indeterminado, a partir da data
            de sua assinatura, podendo ser rescindido a qualquer tempo, mediante
            comunicação prévia de qualquer das partes.
          </Text>
        </View>

        {/* Cláusula Quarta */}
        <View style={styles.section}>
          <Text style={styles.clauseTitle}>Cláusula Quarta - Do Foro</Text>
          <Text style={styles.paragraph}>
            As partes elegem o foro da comarca de Brodowski/SP para dirimir
            quaisquer dúvidas ou litígios oriundos do presente contrato, com
            renúncia de qualquer outro, por mais privilegiado que seja.
          </Text>
        </View>

        {/* Data e assinaturas */}
        <Text style={styles.dateCity}>
          {fmt(funcionario.cidade, "Brodowski")}, {fmtDate(dataAtribuicao)}.
        </Text>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{nomeEmpresa}</Text>
            <Text style={styles.signatureLabel}>COMODANTE</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{fmt(funcionario.nome)}</Text>
            <Text style={styles.signatureLabel}>COMODATÁRIO</Text>
            <Text style={styles.signatureLabel}>CPF: {fmt(funcionario.cpf)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
