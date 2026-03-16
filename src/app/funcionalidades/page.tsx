"use client";

import React from "react";
import Link from "next/link";
import { Zap, Check, ArrowLeft, Shield, Globe, MessageCircle } from "lucide-react";

const features = [
    { title: "Dashboard Geral", cat: "Dashboard", desc: "Visão macro de vendas, OS e financeiro" },
    { title: "PDV (Ponto de Venda)", cat: "Vendas", desc: "Interface rápida para vendas balcão" },
    { title: "Gestão de Vendas", cat: "Vendas", desc: "Histórico de vendas e detalhamento" },
    { title: "Ordens de Serviço (Lista)", cat: "OS", desc: "Listagem centralizada de ordens de serviço" },
    { title: "Nova OS", cat: "OS", desc: "Abertura de ordens com cliente e equipamento" },
    { title: "Prateleira de OS", cat: "OS", desc: "Organização física/status das ordens" },
    { title: "Garantias de OS", cat: "OS", desc: "Gestão de retornos e prazos de garantia" },
    { title: "Catálogo de Estoque", cat: "Estoque", desc: "Listagem geral de produtos e aparelhos" },
    { title: "Gestão de IMEIs", cat: "Estoque", desc: "Controle individual por número de série" },
    { title: "Gestão de Peças", cat: "Estoque", desc: "Peças de reposição e componentes" },
    { title: "Películas e Acessórios", cat: "Estoque", desc: "Grade específica para protetores de tela" },
    { title: "Balanço de Estoque", cat: "Estoque", desc: "Auditoria e contagem física" },
    { title: "Impressão de Etiquetas", cat: "Estoque", desc: "Gerador de etiquetas térmicas e A4" },
    { title: "Movimentação Financeira", cat: "Financeiro", desc: "Fluxo de caixa (entradas e saídas)" },
    { title: "Contas a Pagar/Receber", cat: "Financeiro", desc: "Gestão de prazos e parcelamentos" },
    { title: "Conciliação por Gateway", cat: "Financeiro", desc: "Integração com taxas de operadoras" },
    { title: "Importação de XML", cat: "Fiscal", desc: "Entrada de estoque via arquivo XML" },
    { title: "Emissão de NF-e", cat: "Fiscal", desc: "Nota Fiscal Eletrônica de Produtos" },
    { title: "Emissão de NFC-e", cat: "Fiscal", desc: "Nota Fiscal de Consumidor Eletrônica" },
    { title: "Emissão de NFS-e", cat: "Fiscal", desc: "Nota Fiscal de Serviços Municipal" },
    { title: "Relatórios de Trade-in", cat: "Relatórios", desc: "Desempenho de trocas de aparelhos" },
    { title: "Relatórios de Peças", cat: "Relatórios", desc: "Consumo de componentes em laboratório" },
    { title: "Marketing - Campanhas", cat: "Marketing", desc: "Disparo de mensagens e promoções" },
    { title: "Pos-venda Automático", cat: "Marketing", desc: "Automação de contato após entrega" },
    { title: "Lista de Preços (Marketing)", cat: "Marketing", desc: "Gerador de PDFs para redes sociais" },
    { title: "Gestão de Equipe", cat: "Equipe", desc: "Control de usuários e produtividade" },
    { title: "Gestão de Técnicos", cat: "Equipe", desc: "Comissões e produtividade técnica" },
    { title: "Gestão de Clientes", cat: "Clientes", desc: "CRM básico com histórico de compras" },
    { title: "Hub de Contabilidade", cat: "Integrações", desc: "Fechamento mensal automatizado" },
    { title: "Multi-empresa / Unidades", cat: "Multi-empresa", desc: "Gestão de filiais e subdomínios" },
    { title: "Auditoria de Logs", cat: "Configurações", desc: "Rastreio completo de alterações" },
];

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-slate-50 selection:bg-brand-500 selection:text-white">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-black text-slate-800 tracking-tight">Smart <span className="text-brand-500">OS</span></span>
                </Link>
                <Link href="/" className="text-sm font-bold text-slate-500 hover:text-brand-500 flex items-center gap-2">
                    <ArrowLeft size={16} />
                    Voltar para Home
                </Link>
            </nav>

            <header className="py-20 px-6 text-center max-w-4xl mx-auto space-y-6">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Funcionalidades do <span className="text-brand-500">Smart OS</span></h1>
                <p className="text-xl text-slate-500 font-medium">Explore todos os recursos desenvolvidos especificamente para acelerar sua assistência técnica.</p>
            </header>

            <main className="max-w-7xl mx-auto px-6 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <div key={i} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-[10px] font-black uppercase tracking-widest mb-4">
                                {f.cat}
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">{f.title}</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="bg-slate-900 text-white py-12 px-6 text-center">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    <p>© 2026 Smart OS. Todos os direitos reservados.</p>
                    <div className="flex items-center gap-3">
                        <Globe size={14} />
                        Orgulhosamente Brasileiro
                    </div>
                </div>
            </footer>
        </div>
    );
}
