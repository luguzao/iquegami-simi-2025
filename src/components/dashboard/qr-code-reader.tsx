"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import QrScanner from "qr-scanner"

// Importante: o `qr-scanner` precisa carregar um worker. Em ambientes Next.js
// colocamos o worker em `public/` e apontamos `WORKER_PATH` para ele.
if (typeof window !== "undefined") {
  // @ts-ignore - a propriedade WORKER_PATH existe em runtime no pacote
  QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js"
}
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface QRCodeReaderProps {
  isOpen: boolean
  onClose: () => void
  onScan: (result: string) => void
}

interface QRCodeData {
  content: string
  scannedAt: Date
}

export function QRCodeReader({ isOpen, onClose, onScan }: QRCodeReaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)
  const isStartingRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null)
  const [employeeInfo, setEmployeeInfo] = useState<any | null>(null)
  const [lastAttendance, setLastAttendance] = useState<any | null>(null)
  const [isPerforming, setIsPerforming] = useState(false)
  const [isScanning, setIsScanning] = useState(true)
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const startAttemptsRef = useRef(0)
  const MAX_START_RETRIES = 1
  const [manualInput, setManualInput] = useState("")
  const [showManualInput, setShowManualInput] = useState(false)

  const stopScanner = useCallback(() => {
    // Se está em processo de iniciar, cancelar a flag para evitar race
    isStartingRef.current = false

    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
      } catch (error) {
        console.warn("Erro ao parar scanner:", error)
      }
      qrScannerRef.current = null
    }
    
    // Parar todas as tracks de vídeo ativas
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => {
          track.stop()
        })
        videoRef.current.srcObject = null
      } catch (error) {
        console.warn("Erro ao parar stream de vídeo:", error)
      }
    }
    
    // Limpar qualquer overlay ou highlight que possa ter sobrado
    if (videoRef.current) {
      const canvas = videoRef.current.parentElement?.querySelector('canvas')
      if (canvas) {
        canvas.remove()
      }
      
      // Remover qualquer elemento de highlight
      const highlights = videoRef.current.parentElement?.querySelectorAll('.qr-scanner-highlight, .scan-region-highlight')
      highlights?.forEach(el => el.remove())
    }
  }, [])

  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      })
      // Parar o stream imediatamente, só queríamos verificar a permissão
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      return true
    } catch (err) {
      console.error("Erro ao solicitar permissão da câmera:", err)
      setHasPermission(false)
      setError("Permissão de câmera negada ou câmera não disponível")
      return false
    }
  }, [])

  const startScanner = useCallback(async () => {
    // Se estiver no modo de input manual, não iniciar o scanner
    if (showManualInput) {
      return
    }

    // Evitar chamadas concorrentes que causam play() interrompido
    if (isStartingRef.current || qrScannerRef.current) {
      return
    }

    // Aguardar o elemento de vídeo estar disponível
    let attempts = 0
    while (!videoRef.current && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    if (!videoRef.current) {
      setError("Elemento de vídeo não encontrado")
      return
    }

    isStartingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Primeiro verificar se há câmeras disponíveis
      const hasCamera = await QrScanner.hasCamera()
      if (!hasCamera) {
        setError("Nenhuma câmera encontrada no dispositivo")
        setIsLoading(false)
        return
      }

      // Não solicitar permissão manualmente aqui para evitar duas chamadas
      // a getUserMedia (uma no requestCameraPermission e outra no QrScanner.start)
      // Isso evita races que resultam em "The play() request was interrupted".

      // Verificar novamente se o vídeo ainda existe antes de criar o scanner
      if (!videoRef.current) {
        setError("Elemento de vídeo não encontrado")
        setIsLoading(false)
        return
      }

      // Criar o scanner
      // Se o QrScanner já existir (race), não recriar
      if (!qrScannerRef.current) {
        // @ts-ignore - passar preferredCamera nas opções
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
          console.log("QR Code detectado:", result)
          
          // Parar o scanner imediatamente
          if (qrScannerRef.current) {
            try {
              qrScannerRef.current.stop()
              // Remover highlights manualmente
              const canvas = videoRef.current?.parentElement?.querySelector('canvas')
              if (canvas) {
                canvas.remove()
              }
            } catch (error) {
              console.warn("Erro ao parar scanner:", error)
            }
          }
          
          // Parar o stream de vídeo
          if (videoRef.current?.srcObject) {
            try {
              const stream = videoRef.current.srcObject as MediaStream
              stream.getTracks().forEach(track => track.stop())
            } catch (error) {
              console.warn("Erro ao parar stream:", error)
            }
          }
          
          // Salvar os dados escaneados
          setScannedData({
            content: result,
            scannedAt: new Date()
          })
          
          // Mudar para modo de exibição de resultados
          setIsScanning(false)
          
          // Chamar callback
          onScan(result)
        }
      )

  }

      // Se o usuário selecionou uma câmera, configurar antes de iniciar
      if (selectedDeviceId) {
        try {
          await qrScannerRef.current.setCamera(selectedDeviceId)
        } catch (e) {
          console.warn("Falha ao setar câmera selecionada:", e)
        }
      }

      // Iniciar o scanner
      await qrScannerRef.current.start()
      console.log("Scanner iniciado com sucesso")
      startAttemptsRef.current = 0
      
    } catch (err: unknown) {
      console.error("Erro ao iniciar scanner:", err)
      // Se for um erro de play interrompido (race), apenas logamos e não
      // mostramos uma mensagem de erro crítica ao usuário automaticamente.
      const maybe = err as any
      if (maybe && (maybe.name === 'AbortError' || (typeof maybe.message === 'string' && maybe.message.toLowerCase().includes('play')))) {
        console.warn('Play request interrompido — tentativa concorrente ou navegador bloqueou autoplay.')
        // Retry leve: tentar reiniciar uma vez mais após um pequeno delay
        if (startAttemptsRef.current < MAX_START_RETRIES) {
          startAttemptsRef.current = (startAttemptsRef.current || 0) + 1
          console.debug('Tentativa de restart #' + startAttemptsRef.current + ' após play interrompido')
          setTimeout(() => {
            startScanner()
          }, 300)
          return
        }
      }
      let errorMessage = "Erro ao acessar a câmera"

      if (err && typeof err === 'object' && 'name' in err) {
        const e = err as { name?: string; message?: string }
        if (e.name === "NotAllowedError") {
          errorMessage = "Permissão de câmera negada. Por favor, permita o acesso à câmera."
        } else if (e.name === "NotFoundError") {
          errorMessage = "Nenhuma câmera encontrada no dispositivo."
        } else if (e.name === "NotSupportedError") {
          errorMessage = "Câmera não suportada neste navegador."
        } else if (e.name === "NotReadableError") {
          errorMessage = "Câmera está sendo usada por outro aplicativo."
        } else if (e.message) {
          errorMessage = e.message
        }
      } else {
        errorMessage = String(err)
      }

      setError(errorMessage)
    }
    finally {
      // Garantir flags sempre resetadas
      isStartingRef.current = false
      setIsLoading(false)
    }
  }, [hasPermission, requestCameraPermission, selectedDeviceId, showManualInput])

  // Efeito para iniciar/parar scanner quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      // Reset do estado ao abrir
      setScannedData(null)
      setIsScanning(true)
      setError(null)
      
      // Pequeno delay para garantir que o DOM esteja pronto
      const timer = setTimeout(() => {
        startScanner()
        // Tentar popular a lista de câmeras para permitir seleção
        refreshCameras()
      }, 100)
      
      return () => {
        clearTimeout(timer)
        stopScanner()
      }
    } else {
      // Quando modal fecha, garantir limpeza completa
      stopScanner()
      setScannedData(null)
      setIsScanning(true)
      setError(null)
      setIsLoading(false)
      setHasPermission(null)
    }
  }, [isOpen, stopScanner, startScanner])

  // Efeito para iniciar scanner quando isScanning muda para true
  useEffect(() => {
    if (isOpen && isScanning && !scannedData && !showManualInput) {
      const timer = setTimeout(() => {
        startScanner()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, isScanning, scannedData, showManualInput, startScanner])

  // Efeito para limpar highlights quando não está escaneando
  useEffect(() => {
    if (!isScanning && videoRef.current) {
      // Limpar qualquer canvas ou highlight residual
      const container = videoRef.current.parentElement
      if (container) {
        const canvases = container.querySelectorAll('canvas')
        canvases.forEach(canvas => canvas.remove())
        
        const highlights = container.querySelectorAll('.qr-scanner-highlight, .scan-region-highlight, [class*="qr-scanner"]')
        highlights.forEach(el => el.remove())
      }
    }
  }, [isScanning])

  // Cleanup ao desmontar componente
  useEffect(() => {
    const currentVideo = videoRef.current
    return () => {
      // Garantir que tudo seja limpo ao desmontar
      try {
        isStartingRef.current = false
        if (qrScannerRef.current) {
          qrScannerRef.current.stop()
          qrScannerRef.current.destroy()
          qrScannerRef.current = null
        }
        
        // Parar todas as tracks de mídia
        if (currentVideo?.srcObject) {
          const stream = currentVideo.srcObject as MediaStream
          stream.getTracks().forEach(track => track.stop())
        }
      } catch (error) {
        console.warn("Erro durante cleanup:", error)
      }
    }
  }, [])

  const handleRetry = () => {
    setError(null)
    setHasPermission(null)
    startScanner()
  }

  const handleClose = () => {
    // Parar o scanner e câmera
    stopScanner()
    
    // Reset completo do estado
    setScannedData(null)
    setIsScanning(true)
    setError(null)
    setIsLoading(false)
    setHasPermission(null)
    setManualInput("")
    setShowManualInput(false)
    
    // Chamar callback de fechamento
    onClose()
  }

  const handleScanAgain = () => {
    setScannedData(null)
    setIsScanning(true)
    setError(null)
    setManualInput("")
    setShowManualInput(false)
    // O useEffect vai cuidar de iniciar o scanner
  }

  const refreshCameras = useCallback(async () => {
    try {
      // force=true para tentar obter labels (pode abrir um prompt se necessário)
      const list = await QrScanner.listCameras(true)
      setCameras(list)
      if (!selectedDeviceId && list.length) {
        setSelectedDeviceId(list[0].id)
      }
      console.debug('Câmeras encontradas:', list)
    } catch (err) {
      console.warn('Erro ao listar câmeras:', err)
    }
  }, [selectedDeviceId])

  // Quando o usuário troca a câmera selecionada, aplicar no scanner já existente
  useEffect(() => {
    if (qrScannerRef.current && selectedDeviceId) {
      qrScannerRef.current.setCamera(selectedDeviceId).catch((e: any) => {
        console.warn('Falha ao aplicar câmera selecionada no scanner:', e)
      })
    }
  }, [selectedDeviceId])

  const formatQRData = (data: string) => {
    // Tentar determinar o tipo de QR code
    if (data.startsWith('http://') || data.startsWith('https://')) {
      return { type: 'URL', value: data }
    } else if (data.startsWith('mailto:')) {
      return { type: 'Email', value: data.replace('mailto:', '') }
    } else if (data.startsWith('tel:')) {
      return { type: 'Telefone', value: data.replace('tel:', '') }
    } else if (data.startsWith('WIFI:')) {
      return { type: 'WiFi', value: 'Configuração de rede WiFi' }
    } else if (data.includes('@') && data.includes('.')) {
      return { type: 'Email', value: data }
    } else if (/^\d+$/.test(data)) {
      return { type: 'Número', value: data }
    } else {
      return { type: 'Texto', value: data }
    }
  }

  // When scannedData is set, try to fetch employee info and last attendance
  useEffect(() => {
    if (!scannedData) {
      setEmployeeInfo(null)
      setLastAttendance(null)
      return
    }

    let mounted = true

    const fetchInfo = async () => {
      try {
        // Try to fetch employee by id (most common: QR contains employee.id)
        const { createClient } = await import("@/lib/supabase")
        const supabase = createClient()
        const qr = scannedData.content

        // try find by id first
        let { data: emp } = await supabase
          .from('employees')
          .select('id,name,cpf,store,position,sector,role,isInternal,startDate')
          .eq('id', qr)
          .limit(1)
          .single()

        // if not found and QR looks like CPF or numeric, try search by cpf
        if (!emp) {
          if (/^\d{11}$/.test(qr) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(qr)) {
            const cpf = qr.replace(/\D/g, '')
            const { data: byCpf } = await supabase.from('employees').select('id,name,cpf,store,position,sector,role,isInternal,startDate').eq('cpf', cpf).limit(1).single()
            emp = byCpf as any
          }
        }

        if (mounted) setEmployeeInfo(emp ?? null)

        // fetch last attendance entry for this employee to determine action
        if (emp && emp.id) {
          try {
            const url = `/api/auditoria/last-entries?employeeId=${encodeURIComponent(emp.id)}&limit=1`
            const res = await fetch(url)
            if (res.ok) {
              const json = await res.json()
              const items = json.items || []
              if (items.length > 0) {
                const last = items[0]
                if (mounted) setLastAttendance(last)
              } else {
                if (mounted) setLastAttendance(null)
              }
            }
          } catch (err) {
            console.warn('Erro ao buscar último registro de ponto', err)
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar informações do colaborador', err)
      }
    }

    fetchInfo()

    return () => { mounted = false }
  }, [scannedData])

  const performAttendance = async (type?: 'checkin' | 'checkout') => {
    if (!scannedData) return
    setIsPerforming(true)
    const wasManualInput = showManualInput
    try {
      const payload: any = { qrContent: scannedData.content }
      if (employeeInfo && employeeInfo.id) payload.employeeId = employeeInfo.id
      if (type) payload.type = type

      const res = await fetch('/api/auditoria/perform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Erro ao registrar ponto')
      }

      const json = await res.json()
      const item = json.item || json
      if (item) setLastAttendance(item)

      // show success toast
      toast.success('Ponto registrado com sucesso')
      
      // Voltar ao estado inicial ao invés de fechar
      setScannedData(null)
      setEmployeeInfo(null)
      setLastAttendance(null)
      setManualInput("")
      setIsScanning(true)
      
      // Se foi manual, manter no modo manual e focar o input
      if (wasManualInput) {
        setShowManualInput(true)
        // Pequeno delay para garantir que o input seja renderizado antes de focar
        setTimeout(() => {
          const input = document.querySelector('input[placeholder="Cole ou digite aqui..."]') as HTMLInputElement
          if (input) input.focus()
        }, 100)
      } else {
        // Se foi por câmera, voltar para câmera
        setShowManualInput(false)
      }
    } catch (err: any) {
  console.error('Erro ao perform attendance', err)
  try { toast.error('Erro ao registrar ponto: ' + (err.message || String(err))) } catch (e) { /* ignore */ }
    } finally {
      setIsPerforming(false)
    }
  }

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      toast.error('Digite ou cole um código')
      return
    }
    
    // Parar o scanner se estiver ativo
    stopScanner()
    
    // Processar como se fosse um scan
    setScannedData({
      content: manualInput.trim(),
      scannedAt: new Date()
    })
    
    setIsScanning(false)
    onScan(manualInput.trim())
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isScanning ? "Escanear QR Code" : "QR Code Escaneado"}
          </DialogTitle>
          <DialogDescription>
            {isScanning 
              ? "Posicione o QR code dentro da área destacada para escanear"
              : "Informações do QR code escaneado"
            }
          </DialogDescription>
        </DialogHeader>
        {/* Seletor de câmera colocado acima do preview para não atrapalhar a visão */}
        {isOpen && isScanning && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button 
                variant={showManualInput ? "default" : "outline"}
                onClick={() => {
                  setShowManualInput(!showManualInput)
                  if (!showManualInput) {
                    stopScanner()
                  }
                }}
                size="sm"
              >
                {showManualInput ? "Usar Câmera" : "Ler via coletor"}
              </Button>
              
              {!showManualInput && (
                <>
                  <select
                    value={selectedDeviceId ?? ""}
                    onChange={(e) => setSelectedDeviceId(e.target.value || null)}
                    className="text-sm bg-white text-gray-900 px-2 py-1 rounded border"
                  >
                    <option value="">Selecionar câmera</option>
                    {cameras.map(cam => (
                      <option key={cam.id} value={cam.id}>{cam.label}</option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" onClick={refreshCameras}>Atualizar</Button>
                </>
              )}
            </div>

            {showManualInput && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cole ou digite o código:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleManualSubmit()
                      }
                    }}
                    placeholder="Cole ou digite aqui..."
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    autoFocus
                  />
                  <Button onClick={handleManualSubmit} size="sm">
                    Processar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative w-full">
          {scannedData && !isScanning ? (
            // Tela de resultados com informações do usuário e ação de ponto
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 font-medium">QR Code escaneado com sucesso!</span>
                </div>
                <p className="text-sm text-green-600">{scannedData.scannedAt.toLocaleString('pt-BR')}</p>
              </div>

              <div className="space-y-3">
                {/* Employee info */}
                {employeeInfo ? (
                  <div className="p-3 bg-white rounded border">
                    <p className="font-semibold text-lg">{employeeInfo.name}</p>
                    <p className="text-sm text-muted-foreground">CPF: {employeeInfo.cpf}</p>
                    {employeeInfo.position && <p className="text-sm">Cargo: {employeeInfo.position}</p>}
                    {employeeInfo.store && <p className="text-sm">Loja: {employeeInfo.store}</p>}
                    {employeeInfo.sector && <p className="text-sm">Setor: {employeeInfo.sector}</p>}
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 rounded border">
                    <p className="text-sm text-yellow-800">Usuário não encontrado no sistema.</p>
                  </div>
                )}

                {/* Action buttons based on last attendance */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Última ação: {lastAttendance ? `${lastAttendance.type} — ${new Date(lastAttendance.created_at).toLocaleString('pt-BR')}` : 'Nenhuma'}</p>
                  <div className="flex flex-col gap-2">
                      {(() => {
                        const nextAction = lastAttendance?.type === 'checkin' ? 'checkout' : 'checkin'
                        const actionLabel = nextAction === 'checkin' ? 'Registrar Check-in' : 'Registrar Check-out'
                        return (
                          <Button
                            onClick={() => performAttendance(nextAction as 'checkin' | 'checkout')}
                            className="w-full"
                            disabled={isPerforming}
                          >
                            {isPerforming ? 'Registrando...' : actionLabel}
                          </Button>
                        )
                      })()}
                  </div>
                </div>

                {/* Raw QR content and type (optional) */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Conteúdo do QR:</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded border max-h-32 overflow-y-auto">
                    <p className="text-sm break-all">{scannedData.content}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-destructive text-center mb-4 px-4">{error}</p>
              <Button onClick={handleRetry} variant="outline">
                Tentar novamente
              </Button>
            </div>
          ) : isScanning ? (
            // Modo de scanner ativo
            showManualInput ? (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <p className="text-muted-foreground text-sm">
                  Digite ou cole o código no campo acima
                </p>
              </div>
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-lg object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Iniciando câmera...</p>
                    </div>
                  </div>
                )}

                {!isLoading && !error && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <p className="text-white text-sm bg-black/70 px-2 py-1 rounded">
                      Aponte para um QR Code
                    </p>
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          {scannedData && !isScanning ? (
            <>
              <Button variant="outline" onClick={handleScanAgain}>
                Escanear Novamente
              </Button>
              <Button onClick={handleClose}>
                Fechar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}