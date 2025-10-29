"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import QrScanner from "qr-scanner"
import { Button } from "@/components/ui/button"
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null)
  const [isScanning, setIsScanning] = useState(true)

  const stopScanner = useCallback(() => {
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
    // Aguardar o elemento de vídeo estar disponível
    let attempts = 0
    while (!videoRef.current && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    if (!videoRef.current) {
      setError("Elemento de vídeo não encontrado")
      setIsLoading(false)
      return
    }

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

      // Solicitar permissão se ainda não temos
      if (hasPermission === null) {
        const permissionGranted = await requestCameraPermission()
        if (!permissionGranted) {
          setIsLoading(false)
          return
        }
      }

      // Verificar novamente se o vídeo ainda existe antes de criar o scanner
      if (!videoRef.current) {
        setError("Elemento de vídeo não encontrado")
        setIsLoading(false)
        return
      }

      // Criar o scanner
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

      // Iniciar o scanner
      await qrScannerRef.current.start()
      setIsLoading(false)
      console.log("Scanner iniciado com sucesso")
      
    } catch (err: unknown) {
      console.error("Erro ao iniciar scanner:", err)
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
      setIsLoading(false)
    }
  }, [hasPermission, requestCameraPermission])

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
    if (isOpen && isScanning && !scannedData) {
      const timer = setTimeout(() => {
        startScanner()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, isScanning, scannedData, startScanner])

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
    
    // Chamar callback de fechamento
    onClose()
  }

  const handleScanAgain = () => {
    setScannedData(null)
    setIsScanning(true)
    setError(null)
    // O useEffect vai cuidar de iniciar o scanner
  }

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

        <div className="relative w-full">
          {scannedData && !isScanning ? (
            // Tela de resultados
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 font-medium">QR Code escaneado com sucesso!</span>
                </div>
                <p className="text-sm text-green-600">
                  {scannedData.scannedAt.toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo:</label>
                  <p className="mt-1 text-sm bg-gray-50 p-2 rounded border">
                    {formatQRData(scannedData.content).type}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Conteúdo:</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded border max-h-32 overflow-y-auto">
                    <p className="text-sm break-all">{scannedData.content}</p>
                  </div>
                </div>

                {formatQRData(scannedData.content).type === 'URL' && (
                  <Button 
                    onClick={() => window.open(scannedData.content, '_blank')}
                    className="w-full"
                  >
                    Abrir Link
                  </Button>
                )}
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