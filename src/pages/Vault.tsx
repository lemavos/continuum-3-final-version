import { useEffect, useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { vaultApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import UpgradeModal from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  File,
  Trash2,
  Download,
  Loader2,
  HardDrive,
} from "lucide-react";
import type { VaultFile } from "@/types";

const MAX_FILE_SIZE_MB = 50;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/json",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default function Vault() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { canUploadVault, usage, getLimitMessage, refresh } = usePlanGate();

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await vaultApi.list();
      setFiles(data);
    } catch {
      toast({ title: "Erro ao carregar arquivos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast({ title: `Arquivo muito grande (máx ${MAX_FILE_SIZE_MB}MB)`, variant: "destructive" });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Tipo de arquivo não permitido", variant: "destructive" });
      return;
    }
    if (!canUploadVault(fileSizeMB)) {
      setUpgradeOpen(true);
      return;
    }

    setUploading(true);
    try {
      await vaultApi.upload(file);
      toast({ title: "Arquivo enviado!" });
      await Promise.all([fetchFiles(), refresh()]);
    } catch (err: any) {
      toast({
        title: "Erro no upload",
        description: err.response?.data?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await vaultApi.delete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      await refresh();
    } catch {
      toast({ title: "Erro ao deletar", variant: "destructive" });
    }
  };

  const handleDownload = async (file: VaultFile) => {
    try {
      const { data } = await vaultApi.download(file.id);
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao baixar", variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vault</h1>
            <p className="text-sm text-muted-foreground">
              {getLimitMessage("vault") || "Armazenamento de arquivos criptografados"}
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Upload
            </Button>
          </div>
        </div>

        {/* Usage info */}
        {usage && (
          <div className="bento-card p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground font-medium">Armazenamento</span>
              <span className="text-xs text-muted-foreground ml-auto">{getLimitMessage("vault")}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum arquivo no Vault
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="bento-card group p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <File className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 rounded hover:bg-accent transition-colors"
                  >
                    <Download className="w-4 h-4 text-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason="Você atingiu o limite de armazenamento do seu plano."
      />
    </AppLayout>
  );
}
