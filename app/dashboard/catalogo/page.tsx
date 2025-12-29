"use client"

import React, { useMemo, useState } from "react"
import { read, utils } from "xlsx"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, ArrowUp, ArrowDown } from "lucide-react"

type SheetData = {
  name: string
  rows: (string | number | null)[][]
}

export default function CatalogoPage() {
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const allowedSheets = useMemo(
    () => new Set(["PALETAS DE PADEL", "BOLSOS Y MOCHILAS", "ACCESORIOS Y ZAPATILLAS", "PELOTAS PADEL"]),
    []
  )

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer()
    const wb = read(buf, { type: "array" })
    const names = wb.SheetNames || []
    const parsed: SheetData[] = names
      .filter((n) => allowedSheets.has(n.toUpperCase()))
      .map((n) => {
        const ws = wb.Sheets[n]
        const raw = utils.sheet_to_json(ws, { header: 1, blankrows: false }) as any[][]
        const sliced = raw.slice(20)
        const withoutA = sliced.map((row) => row.slice(1))
        return { name: n, rows: withoutA }
      })
    setSheets(parsed)
    setActiveTab(parsed[0]?.name || "")
  }

  const updateCell = (sheetIdx: number, r: number, c: number, val: string) => {
    setSheets((prev) => {
      const next = [...prev]
      const sheet = { ...next[sheetIdx] }
      const rows = sheet.rows.map((row, ri) =>
        ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row
      )
      sheet.rows = rows
      next[sheetIdx] = sheet
      return next
    })
  }

  const getHeader = (rows: (string | number | null)[][]) => {
    return rows[0] || []
  }

  const getColCount = (rows: (string | number | null)[][]) => {
    const headerLen = rows[0]?.length || 0
    const maxLen = rows.reduce((m, r) => Math.max(m, r.length), headerLen)
    return Math.max(maxLen, 1)
  }

  const findColumnIndex = (header: (string | number | null)[], token: string) => {
    const t = token.toLowerCase()
    return header.findIndex((h) => String(h ?? "").toLowerCase().includes(t))
  }
  const sanitizeHeader = (label: string | number | null, idx: number) => {
    const s = String(label ?? `Col ${idx + 1}`)
    if (/^col\s*\d+$/i.test(s)) return ""
    return s
  }
  const widthClassForIndex = (ci: number) => {
    if (ci === 0) return "w-[46%] min-w-[22rem]"
    if (ci === 1) return "w-[8%] min-w-[8rem]"
    if (ci === 2) return "w-[8%] min-w-[8rem]"
    if (ci === 3) return "w-[8%] min-w-[8rem]"
    if (ci === 4) return "w-[6%] min-w-[4rem]"
    if (ci === 5) return "w-[10%] min-w-[8rem]"
    if (ci === 6) return "w-[8%] min-w-[6rem]"
    if (ci === 7) return "w-[12%] min-w-[10rem]"
    if (ci === 8) return "w-[6%] min-w-[5rem]"
    if (ci === 9) return "w-[6%] min-w-[4rem]"
    if (ci === 10) return "w-[10%] min-w-[8rem]"
    return "w-[8%] min-w-[6rem]"
  }
  const isPriceCol = (ci: number) => ci === 1 || ci === 2 || ci === 3
  const formatARS = (val: any) => {
    const n = Number(String(val).replace(/[^\d.-]/g, ""))
    if (Number.isFinite(n)) {
      return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n)
    }
    return String(val ?? "")
  }
  const moveRow = (sheetIdx: number, displayRowIndex: number, direction: "up" | "down") => {
    setSheets((prev) => {
      const next = [...prev]
      const sheet = { ...next[sheetIdx] }
      const from = displayRowIndex + 1
      const to = direction === "up" ? from - 1 : from + 1
      if (to <= 0 || to >= sheet.rows.length) return prev
      const rows = [...sheet.rows]
      const [item] = rows.splice(from, 1)
      rows.splice(to, 0, item)
      sheet.rows = rows
      next[sheetIdx] = sheet
      return next
    })
  }
  const deleteRow = (sheetIdx: number, displayRowIndex: number) => {
    setSheets((prev) => {
      const next = [...prev]
      const sheet = { ...next[sheetIdx] }
      const idx = displayRowIndex + 1
      const rows = sheet.rows.filter((_, i) => i !== idx)
      sheet.rows = rows
      next[sheetIdx] = sheet
      return next
    })
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen overflow-x-hidden">
        <AppSidebar
          activeTab="rentabilidad"
          setActiveTab={() => {}}
          onLogout={() => {}}
        />
        <SidebarInset className="flex-1 bg-muted/20">
          <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-20">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Catálogo</h1>
          </div>
          <div className="p-4 space-y-4">
            <Card className="border-0 shadow-none">
              <CardContent className="flex items-center gap-3 p-0">
                <Input
                  type="file"
                  accept=".xlsx,.xlsm,.csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => setSheets([])}
                >
                  Limpiar
                </Button>
              </CardContent>
            </Card>

            {sheets.length > 0 && (
              <Card>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="flex flex-wrap gap-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500 text-white rounded-xl p-2 sticky top-0 z-10 shadow">
                      {sheets.map((s) => (
                        <TabsTrigger key={s.name} value={s.name} className="rounded-full px-5 py-2 bg-white/10 hover:bg-white/20 data-[state=active]:bg-white data-[state=active]:text-primary shadow-sm">
                          {s.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {sheets.map((s, si) => (
                      <TabsContent key={s.name} value={s.name}>
                        <div className="border rounded-xl shadow bg-white">
                          <Table className="table-fixed w-full">
                            <TableHeader>
                              <TableRow>
                                {Array.from({ length: getColCount(s.rows) }).map((_, ci) => {
                                  const label = sanitizeHeader(getHeader(s.rows)[ci], ci)
                                  return (
                                    <TableHead
                                      key={ci}
                                      className={`sticky top-0 z-10 text-center align-middle ${widthClassForIndex(ci)} bg-gradient-to-r from-blue-600 to-indigo-600 text-white`}
                                    >
                                      {String(label)}
                                    </TableHead>
                                  )
                                })}
                                <TableHead className="sticky top-0 z-10 text-center align-middle w-[8%] min-w-[6rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                  Acciones
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {s.rows.slice(1).map((row, ri) => {
                                const estadoIdx = 5
                                const cantidadIdx = 6
                                return (
                                  <TableRow key={ri} className="odd:bg-muted/20 hover:bg-muted/40 transition-colors">
                                    {Array.from({ length: getColCount(s.rows) }).map((_, ci) => {
                                      const val = row[ci] ?? ""
                                      const isEstado = ci === estadoIdx
                                      const isCantidad = ci === cantidadIdx
                                      let cellClass = `${widthClassForIndex(ci)} px-3 py-2 rounded border bg-background whitespace-normal break-words text-center align-middle focus:outline-none mx-1 my-1`
                                      if (isEstado) {
                                        const t = String(val).toLowerCase()
                                        if (t.includes("stock") && !t.includes("sin")) {
                                          cellClass += " text-emerald-600 font-semibold"
                                        } else if (t.includes("sin")) {
                                          cellClass += " text-red-600 font-semibold"
                                        }
                                      } else if (isCantidad) {
                                        const q = Number(val)
                                        if (!Number.isNaN(q)) {
                                          if (q > 0) cellClass += " text-emerald-600 font-semibold"
                                          else if (q === 0) cellClass += " text-red-600 font-semibold"
                                        }
                                      }
                                      if (ci === 0) {
                                        cellClass += " bg-indigo-50/50"
                                      }
                                      const displayVal = isPriceCol(ci) ? formatARS(val) : String(val)
                                      return (
                                        <TableCell key={ci}>
                                          <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            className={cellClass}
                                            onBlur={(e) => {
                                              const newVal = isPriceCol(ci) ? formatARS(e.currentTarget.textContent || "") : (e.currentTarget.textContent || "")
                                              updateCell(si, ri + 1, ci, newVal)
                                            }}
                                          >
                                            {displayVal}
                                          </div>
                                        </TableCell>
                                      )
                                    })}
                                    <TableCell className="align-middle">
                                      <div className="flex items-center justify-center gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => moveRow(si, ri, "up")}>
                                          <ArrowUp className="h-4 w-4" />
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => moveRow(si, ri, "down")}>
                                          <ArrowDown className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => deleteRow(si, ri)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
