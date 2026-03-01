import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createCliente } from "@/services/clientes";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { type Cliente } from "@/types/database";

interface CadastroRapidoClienteModalProps {
    onClose: () => void;
    onSuccess: (cliente: Cliente) => void;
    initialName?: string;
}

export function CadastroRapidoClienteModal({ onClose, onSuccess, initialName = "" }: CadastroRapidoClienteModalProps) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form fields
    const [nome, setNome] = useState(initialName);
    const [telefone, setTelefone] = useState("");
    const [cpfCnpj, setCpfCnpj] = useState("");

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!profile?.empresa_id) return;
        if (!nome.trim()) {
            toast.error("O nome do cliente é obrigatório");
            return;
        }

        setLoading(true);
        try {
            const novoCliente = await createCliente({
                empresa_id: profile.empresa_id,
                nome: nome.trim(),
                telefone: telefone.trim() || null,
                cpf_cnpj: cpfCnpj.trim() || null,
                segmento: "novo",
            } as any);
            toast.success("Cliente cadastrado com sucesso!");
            onSuccess(novoCliente);
        } catch (error: any) {
            console.error("Erro ao cadastrar cliente:", error);
            toast.error("Erro ao cadastrar: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <GlassCard className="w-full max-w-md p-6 bg-white relative animate-in zoom-in-95">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Cadastro Rápido</h2>
                        <p className="text-sm text-slate-500">Adicione um novo cliente na hora</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nome Completo *</label>
                        <input
                            type="text"
                            required
                            className="input-glass h-12 w-full font-bold"
                            placeholder="Ex: João da Silva"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Telefone/Zap</label>
                            <input
                                type="text"
                                className="input-glass h-12 w-full font-bold"
                                placeholder="(00) 00000-0000"
                                value={telefone}
                                onChange={(e) => setTelefone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">CPF / CNPJ</label>
                            <input
                                type="text"
                                className="input-glass h-12 w-full font-bold"
                                placeholder="Apenas números..."
                                value={cpfCnpj}
                                onChange={(e) => setCpfCnpj(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !nome.trim()}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Salvar Cliente
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
