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
    textTransform: "uppercase",
  },
  paragraph: {
    marginBottom: 6,
    textAlign: "justify",
  },
  equipmentBox: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 10,
    marginBottom: 12,
  },
  equipmentRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  equipmentLabel: {
    fontFamily: "Helvetica-Bold",
    width: 160,
  },
  equipmentValue: {
    flex: 1,
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
  numbered: {
    marginBottom: 4,
    paddingLeft: 10,
  },
});

export interface TermoResponsabilidadeNotebookProps {
  funcionario: {
    nome: string;
    cpf: string;
    cidade?: string | null;
  };
  ativo: {
    marca: string | null;
    modelo: string;
    numero_serie: string | null;
    valor_aquisicao?: number | null;
    acessorios?: string | null;
  };
  dataAtribuicao: string;
  empresa?: {
    nome: string;
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

function fmtValor(valor: number | null | undefined): string {
  if (!valor) return "_____________";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TermoResponsabilidadeNotebookPDF({
  funcionario,
  ativo,
  dataAtribuicao,
  empresa,
}: TermoResponsabilidadeNotebookProps) {
  const nomeEmpresa = empresa?.nome ?? "DISTRIBUIDORA G4 ARANTES LTDA";
  const modeloCompleto = [ativo.marca, ativo.modelo].filter(Boolean).join(" ");
  const acessorios = fmt(ativo.acessorios, "Fonte e Cabo Original");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Título */}
        <Text style={styles.title}>
          Termo de Responsabilidade de Uso de Equipamentos de Informática
        </Text>

        {/* Identificação */}
        <Text style={styles.paragraph}>
          Pelo presente instrumento, eu,{" "}
          <Text style={styles.bold}>{fmt(funcionario.nome)}</Text>, inscrito no
          CPF sob nº <Text style={styles.bold}>{fmt(funcionario.cpf)}</Text>,
          doravante denominado <Text style={styles.bold}>"USUÁRIO"</Text>,
          declaro ter recebido da empresa{" "}
          <Text style={styles.bold}>{nomeEmpresa}</Text>, doravante denominada{" "}
          <Text style={styles.bold}>"EMPRESA"</Text>, o(s) equipamento(s) abaixo
          descrito(s):
        </Text>

        {/* Caixa do equipamento */}
        <View style={styles.equipmentBox}>
          <Text style={[styles.bold, { marginBottom: 6 }]}>
            Descrição do equipamento:
          </Text>
          <View style={styles.equipmentRow}>
            <Text style={styles.equipmentLabel}>Marca / Modelo:</Text>
            <Text style={styles.equipmentValue}>{modeloCompleto}</Text>
          </View>
          <View style={styles.equipmentRow}>
            <Text style={styles.equipmentLabel}>Service Tag / Serial:</Text>
            <Text style={styles.equipmentValue}>{fmt(ativo.numero_serie)}</Text>
          </View>
          <View style={styles.equipmentRow}>
            <Text style={styles.equipmentLabel}>Acessórios:</Text>
            <Text style={styles.equipmentValue}>{acessorios}</Text>
          </View>
        </View>

        <Text style={styles.paragraph}>
          E firmo as seguintes condições de uso e responsabilidade:
        </Text>

        {/* 1. Responsabilidade */}
        <View style={styles.section}>
          <Text style={styles.clauseTitle}>
            1. Da Responsabilidade pelo Equipamento
          </Text>
          <Text style={styles.numbered}>
            1.1. O USUÁRIO se responsabiliza pela guarda, conservação e uso
            adequado do(s) equipamento(s) entregue(s), como se fossem seus.
          </Text>
          <Text style={styles.numbered}>
            1.2. O uso do equipamento deve ser exclusivamente para fins
            profissionais, sendo vedada sua utilização para atividades pessoais,
            ilegais ou que possam comprometer a segurança da informação da
            EMPRESA.
          </Text>
          <Text style={styles.numbered}>
            1.3. Em caso de mau uso, negligência, perda, extravio, danos ou uso
            indevido, o USUÁRIO se responsabilizará pelos custos de reparo ou
            substituição do equipamento, conforme avaliação técnica, autorizando,
            desde já, o desconto em folha de pagamento e/ou verbas rescisórias.
          </Text>
          <Text style={styles.numbered}>
            1.4. Considerar-se-á mau uso eventuais acidentes culposos e/ou
            dolosos que venham a danificar os equipamentos, tais como acidentes
            pessoais, alimentar-se e deixar que os alimentos danifiquem os
            equipamentos, chuva, sol em excesso, etc.
          </Text>
          <Text style={styles.numbered}>
            1.5. Em caso de roubo ou furto, o USUÁRIO deverá apresentar
            imediatamente o Boletim de Ocorrência para que a EMPRESA adote as
            medidas cabíveis.
          </Text>
          <Text style={styles.numbered}>
            1.6. O valor de referência do(s) equipamento(s) recebido(s) é de{" "}
            <Text style={styles.bold}>{fmtValor(ativo.valor_aquisicao)}</Text>,
            valor este que poderá ser utilizado como base para ressarcimento em
            caso de perda total, roubo, furto ou dano irreparável.
          </Text>
          <Text style={styles.numbered}>
            1.7. Neste ato o USUÁRIO declara que recebeu toda a orientação
            necessária para os cuidados necessários para com os equipamentos.
          </Text>
        </View>

        {/* 2. Manutenção */}
        <View style={styles.section}>
          <Text style={styles.clauseTitle}>2. Da Manutenção e Suporte</Text>
          <Text style={styles.numbered}>
            2.1. O USUÁRIO compromete-se a não realizar reparos, alterações ou
            manutenções por conta própria, devendo acionar a equipe de TI da
            EMPRESA para qualquer necessidade de suporte.
          </Text>
          <Text style={styles.numbered}>
            2.2. A utilização de softwares não autorizados é estritamente
            proibida.
          </Text>
        </View>

        {/* 3. LGPD */}
        <View style={styles.section}>
          <Text style={styles.clauseTitle}>
            3. Da Segurança da Informação e LGPD
          </Text>
          <Text style={styles.numbered}>
            3.1. O USUÁRIO declara ciência de que todos os dados, informações,
            arquivos e sistemas contidos no equipamento são de propriedade
            exclusiva da EMPRESA.
          </Text>
          <Text style={styles.numbered}>
            3.2. É vedada a cópia, compartilhamento, exclusão ou alteração de
            dados corporativos sem autorização expressa da EMPRESA.
          </Text>
          <Text style={styles.numbered}>
            3.3. O USUÁRIO compromete-se a zelar pela confidencialidade e
            integridade das informações acessadas por meio do equipamento.
          </Text>
          <Text style={styles.numbered}>
            3.4. Nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018 -
            LGPD), o USUÁRIO obriga-se a: (a) Tratar os dados pessoais acessados
            apenas conforme orientações da EMPRESA; (b) Não compartilhar dados
            pessoais ou corporativos com terceiros sem autorização; (c) Adotar
            boas práticas de segurança digital, como uso de senhas fortes e não
            compartilhamento de credenciais.
          </Text>
        </View>

        {/* 4. Devolução */}
        <View style={styles.section}>
          <Text style={styles.clauseTitle}>4. Da Devolução</Text>
          <Text style={styles.numbered}>
            4.1. No desligamento ou mudança de função, o USUÁRIO deverá devolver
            imediatamente o(s) equipamento(s) e todos os acessórios em perfeito
            estado de conservação, considerando apenas o desgaste natural pelo
            uso adequado.
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
            <Text style={styles.signatureLabel}>EMPRESA</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{fmt(funcionario.nome)}</Text>
            <Text style={styles.signatureLabel}>USUÁRIO</Text>
            <Text style={styles.signatureLabel}>CPF: {fmt(funcionario.cpf)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
