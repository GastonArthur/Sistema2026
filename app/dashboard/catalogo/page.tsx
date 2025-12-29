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
  const widthClassFor = (header: (string | number | null)[], ci: number) => {
    const h = String(header[ci] ?? "").toLowerCase()
    if (h.includes("titulo") || h.includes("nombre") || h.includes("producto")) return "w-[40%] min-w-[18rem]"
    if (h.includes("sku")) return "w-[12%] min-w-[8rem]"
    if (h.includes("estado") || h.includes("cant")) return "w-[8%] min-w-[6rem]"
    if (sanitizeHeader(header[ci], ci) === "") return "w-[4%] min-w-[3rem]"
    return "w-[10%] min-w-[6rem]"
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
                    <TabsList className="flex flex-wrap gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border sticky top-0 z-10 shadow-sm">
                      {sheets.map((s) => (
                        <TabsTrigger key={s.name} value={s.name} className="rounded-full px-5 py-2 bg-background border hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
                          {s.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {sheets.map((s, si) => (
                      <TabsContent key={s.name} value={s.name}>
                        <div className="border rounded-xl shadow-sm bg-white">
                          <Table className="table-fixed w-full">
                            <TableHeader>
                              <TableRow>
                                {Array.from({ length: getColCount(s.rows) }).map((_, ci) => {
                                  const header = getHeader(s.rows)
                                  const label = sanitizeHeader(header[ci], ci)
                                  return (
                                    <TableHead
                                      key={ci}
                                      className="sticky top-0 bg-background z-10 text-muted-foreground text-center"
                                    >
                                      {String(label)}
                                    </TableHead>
                                  )
                                })}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {s.rows.slice(1).map((row, ri) => {
                                const header = getHeader(s.rows)
                                const estadoIdx = findColumnIndex(header, "estado")
                                const cantidadIdx = findColumnIndex(header, "cant")
                                return (
                                  <TableRow key={ri} className="odd:bg-muted/30 hover:bg-muted/40 transition-colors">
                                    {Array.from({ length: getColCount(s.rows) }).map((_, ci) => {
                                      const val = row[ci] ?? ""
                                      const isEstado = ci === estadoIdx
                                      const isCantidad = ci === cantidadIdx
                                      let cellClass = `${widthClassFor(header, ci)} px-3 py-2 rounded border bg-background whitespace-normal break-words text-center focus:outline-none`
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
                                      const h = String(header[ci] ?? "").toLowerCase()
                                      if (h.includes("titulo") || h.includes("nombre") || h.includes("producto")) {
                                        cellClass = cellClass.replace("text-center", "text-left")
                                        cellClass += " bg-indigo-50/50"
                                      }
                                      return (
                                        <TableCell key={ci}>
                                          <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            className={cellClass}
                                            onBlur={(e) => updateCell(si, ri + 1, ci, e.currentTarget.textContent || "")}
                                          >
                                            {String(val)}
                                          </div>
                                        </TableCell>
                                      )
                                    })}
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
