"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateTransaction,
  useUploadTransactionReceipt,
} from "@/hooks/use-transactions";
import { useCurrentProfile } from "@/hooks/use-profile";
import { TRANSACTION_CATEGORIES } from "@/types/transaction";

export default function NewTransactionPage() {
  const router = useRouter();
  const { data: profile } = useCurrentProfile();
  const createTransaction = useCreateTransaction();
  const uploadReceipt = useUploadTransactionReceipt();

  // Form state
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<"approved" | "pending">("approved");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const isSubmitting = createTransaction.isPending || uploadReceipt.isPending;

  // Manejar seleccion de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Tipo de archivo no permitido. Use JPG, PNG, GIF, WebP o PDF");
      return;
    }

    // Validar tamano (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo excede el tamano maximo de 10MB");
      return;
    }

    setReceiptFile(file);

    // Preview para imagenes
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      alert("Selecciona una categoria");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert("Ingresa un monto valido");
      return;
    }

    try {
      let receiptUrl: string | undefined;

      // Subir comprobante si existe
      if (receiptFile) {
        receiptUrl = await uploadReceipt.mutateAsync({ file: receiptFile });
      }

      // Crear transaccion
      await createTransaction.mutateAsync({
        type,
        category,
        description: description || undefined,
        amount: parseFloat(amount),
        date,
        status,
        receipt_url: receiptUrl,
      });

      router.push("/finances");
    } catch (err) {
      alert("Error al crear transaccion: " + (err as Error).message);
    }
  };

  const categories = TRANSACTION_CATEGORIES[type];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/finances">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Nueva Transaccion
          </h1>
          <p className="text-muted-foreground">
            Registrar un nuevo ingreso o gasto
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalles de la transaccion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de transaccion */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={type === "expense" ? "default" : "outline"}
                className={type === "expense" ? "bg-red-500 hover:bg-red-600" : ""}
                onClick={() => {
                  setType("expense");
                  setCategory("");
                }}
              >
                Gasto
              </Button>
              <Button
                type="button"
                variant={type === "income" ? "default" : "outline"}
                className={type === "income" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                onClick={() => {
                  setType("income");
                  setCategory("");
                }}
              >
                Ingreso
              </Button>
            </div>

            {/* Categoria / Tipo */}
            <div className="space-y-2">
              <Label htmlFor="category">
                Tipo {type === "expense" ? "de gasto" : "de ingreso"} *
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descripcion */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Descripcion
                <span className="text-muted-foreground text-xs ml-2">
                  (Ej: Pago colaborador Juan Perez)
                </span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el detalle de la transaccion..."
                rows={2}
              />
              {profile?.full_name && (
                <p className="text-xs text-muted-foreground">
                  Registrado por: {profile.full_name}
                </p>
              )}
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (S/) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  S/
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Estatus */}
            <div className="space-y-2">
              <Label htmlFor="status">Estatus *</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "approved" | "pending")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Comprobante / Boleta */}
            <div className="space-y-2">
              <Label>Comprobante / Boleta</Label>
              {!receiptFile ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Haz clic para subir o arrastra un archivo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG, GIF, WebP o PDF (max. 10MB)
                    </span>
                  </label>
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {receiptPreview ? (
                        <img
                          src={receiptPreview}
                          alt="Preview"
                          className="h-16 w-16 object-cover rounded"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm truncate max-w-[200px]">
                          {receiptFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(receiptFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href="/finances">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  "Guardar transaccion"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
