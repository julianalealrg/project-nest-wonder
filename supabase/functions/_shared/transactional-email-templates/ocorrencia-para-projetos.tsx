/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface OcorrenciaParaProjetosProps {
  codigo?: string
  cliente?: string
  numeroOs?: string
  ambiente?: string
  urgencia?: string
  justificativa?: string
  instrucao?: string
  abertoPor?: string
  projetistaNome?: string
}

const URGENCIA_LABEL: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
}

const OcorrenciaParaProjetosEmail = ({
  codigo,
  cliente,
  numeroOs,
  ambiente,
  urgencia,
  justificativa,
  instrucao,
  abertoPor,
  projetistaNome,
}: OcorrenciaParaProjetosProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>
      Nova demanda de Projetos: {codigo ?? 'registro'} — {cliente ?? ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>NUE</Heading>
        </Section>

        <Section style={badge}>
          <Text style={badgeText}>DEMANDA PARA PROJETOS</Text>
        </Section>

        <Heading style={h1}>
          {projetistaNome ? `Olá, ${projetistaNome}` : 'Olá'}
        </Heading>
        <Text style={text}>
          Um novo registro foi aberto e encaminhado para a equipe de Projetos.
          Avalie a instrução abaixo e atualize a OS conforme necessário.
        </Text>

        <Section style={infoBox}>
          <Text style={infoRow}>
            <span style={infoLabel}>Código: </span>
            <span style={infoValue}>{codigo ?? '—'}</span>
          </Text>
          <Text style={infoRow}>
            <span style={infoLabel}>OS: </span>
            <span style={infoValue}>{numeroOs ?? '—'}</span>
          </Text>
          <Text style={infoRow}>
            <span style={infoLabel}>Cliente: </span>
            <span style={infoValue}>{cliente ?? '—'}</span>
          </Text>
          <Text style={infoRow}>
            <span style={infoLabel}>Ambiente: </span>
            <span style={infoValue}>{ambiente ?? '—'}</span>
          </Text>
          <Text style={infoRow}>
            <span style={infoLabel}>Urgência: </span>
            <span style={infoValue}>
              {urgencia ? URGENCIA_LABEL[urgencia] ?? urgencia : '—'}
            </span>
          </Text>
          {abertoPor ? (
            <Text style={infoRow}>
              <span style={infoLabel}>Aberto por: </span>
              <span style={infoValue}>{abertoPor}</span>
            </Text>
          ) : null}
        </Section>

        {justificativa ? (
          <>
            <Heading style={h2}>Justificativa</Heading>
            <Text style={quote}>{justificativa}</Text>
          </>
        ) : null}

        {instrucao ? (
          <>
            <Heading style={h2}>Instrução para Projetos</Heading>
            <Text style={quote}>{instrucao}</Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>NUE Projetos — Sistema PCP</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OcorrenciaParaProjetosEmail,
  subject: (data: Record<string, any>) =>
    `Nova demanda de Projetos: ${data?.codigo ?? 'registro'} — ${data?.cliente ?? ''}`.trim(),
  displayName: 'Ocorrência para Projetos',
  previewData: {
    codigo: 'OC25-014',
    cliente: 'Maria Silva',
    numeroOs: '1082/25',
    ambiente: 'Cozinha',
    urgencia: 'alta',
    justificativa: 'Medida do tampo divergente do projeto enviado.',
    instrucao: 'Revisar projeto e gerar nova OS com medida 1.250 × 0.620 m.',
    abertoPor: 'Gustavo (obra)',
    projetistaNome: 'Letícia',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Montserrat, Arial, sans-serif',
  color: '#0D0D0D',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
  backgroundColor: '#F0EDE8',
}
const header = { textAlign: 'center' as const, marginBottom: '16px' }
const brand = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  letterSpacing: '4px',
  color: '#0D0D0D',
  margin: '0',
}
const badge = {
  backgroundColor: '#F3E8FF',
  borderLeft: '3px solid #8E44AD',
  padding: '8px 12px',
  margin: '0 0 20px',
}
const badgeText = {
  color: '#8E44AD',
  fontSize: '11px',
  fontWeight: 'bold' as const,
  letterSpacing: '1.5px',
  margin: '0',
}
const h1 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#0D0D0D',
  margin: '0 0 12px',
}
const h2 = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: '#3D3D38',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '24px 0 8px',
}
const text = {
  fontSize: '14px',
  color: '#3D3D38',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const infoBox = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #CCC8C2',
  borderRadius: '4px',
  padding: '16px 18px',
  margin: '0 0 8px',
}
const infoRow = {
  fontSize: '13px',
  color: '#0D0D0D',
  margin: '0 0 6px',
  lineHeight: '1.5',
}
const infoLabel = {
  color: '#3D3D38',
  fontWeight: '600' as const,
}
const infoValue = {
  color: '#0D0D0D',
}
const quote = {
  fontSize: '14px',
  color: '#0D0D0D',
  lineHeight: '1.6',
  margin: '0 0 12px',
  padding: '10px 14px',
  backgroundColor: '#FFFFFF',
  borderLeft: '3px solid #8E44AD',
  whiteSpace: 'pre-wrap' as const,
}
const hr = { borderColor: '#CCC8C2', margin: '32px 0 16px' }
const footer = {
  fontSize: '12px',
  color: '#3D3D38',
  textAlign: 'center' as const,
  margin: '0',
}
