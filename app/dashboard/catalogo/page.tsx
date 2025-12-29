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

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer()
    const wb = read(buf, { type: "array" })
    const names = wb.SheetNames || []
    const parsed: SheetData[] = names.map((n) => {
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar
          activeTab="rentabilidad"
          setActiveTab={() => {}}
          onLogout={() => {}}
        />
        <SidebarInset className="flex-1">
          <div className="flex items-center gap-2 p-4 border-b">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Catálogo</h1>
          </div>
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subir hoja de cálculo</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
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
                <CardHeader>
                  <CardTitle>Catálogo (desde fila 21, sin columna A)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="flex flex-wrap">
                      {sheets.map((s) => (
                        <TabsTrigger key={s.name} value={s.name}>
                          {s.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {sheets.map((s, si) => (
                      <TabsContent key={s.name} value={s.name}>
                        <div className="overflow-auto border rounded-md">
                          <Table className="min-w-[1000px]">
                            <TableHeader>
                              <TableRow>
                                {Array.from({ length: getColCount(s.rows) }).map((_, ci) => {
                                  const header = getHeader(s.rows)
                                  const label = header[ci]
                                  return (
                                    <TableHead
                                      key={ci}
                                      className="sticky top-0 bg-background z-10"
                                    >
                                      {String(label ?? `Col ${ci + 1}`)}
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
                                  <TableRow key={ri} className="odd:bg-muted/30">
                                    {Array.from({ length: getColCount(s.rows) }).map((_, ci) => {
                                      const val = row[ci] ?? ""
                                      const isEstado = ci === estadoIdx
                                      const isCantidad = ci === cantidadIdx
                                      let cellClass = "min-w-24 px-2 py-1 rounded border hover:bg-muted/50 focus:outline-none"
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
