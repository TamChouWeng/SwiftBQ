
import React, { useMemo, useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Download, FileText, AlertCircle, ArrowLeft, Search, Calendar, Clock, User, ChevronDown, Save, RotateCcw, ArrowUpDown } from 'lucide-react';
import { useAppStore } from '../store';
import { AppLanguage, BQItem } from '../types';
import { TRANSLATIONS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNumber } from '../utils/formatters';
import { getPriceValue } from '../utils/priceHelpers';

interface Props {
    currentLanguage: AppLanguage;
    isSidebarOpen: boolean;
}

type SortKey = 'date' | 'validityPeriod';
type SortDirection = 'asc' | 'desc';

const QuotationView: React.FC<Props> = ({ currentLanguage, isSidebarOpen }) => {
    const {
        bqItems,
        currentProjectId,
        setCurrentProjectId,
        currentVersionId,
        setCurrentVersionId,
        projects,
        updateProject,
        getProjectTotal,

        appSettings,
        hasUnsavedChanges,
        isSaving,
        updateVersionDetails,
        saveAllChanges,
        discardAllChanges,
        setVersionEdit,
        versionEdits,
        bqItemEdits,
        setBQItemEdit,
        pendingProjectEdits,
        setPendingProjectEdit,
    } = useAppStore();
    const t = TRANSLATIONS[currentLanguage];
    const [searchQuery, setSearchQuery] = useState('');

    // --- Local discount buffer: avoids a DB write on every keystroke ---
    const [localDiscount, setLocalDiscount] = useState<string>('');

    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'desc' });

    // Local state for selecting version in Quotation View
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

    // Get current project details
    const activeProject = useMemo(() =>
        projects.find(p => p.id === currentProjectId),
        [projects, currentProjectId]);

    useEffect(() => {
        // Prefer the version that's currently active in BQ Builder (currentVersionId),
        // so both tabs always show the same version. Fall back to the first version
        // if BQ Builder has no active version selected yet.
        if (currentVersionId) {
            setSelectedVersionId(currentVersionId);
        } else if (activeProject && !selectedVersionId && activeProject.versions.length > 0) {
            setSelectedVersionId(activeProject.versions[0].id);
        }
    }, [activeProject, currentVersionId]);

    // Keep localDiscount in sync:
    // 1. When project changes or after discardAllChanges resets pendingProjectEdits
    // 2. Prefer pendingProjectEdits (buffered unsaved value) over the committed DB value
    useEffect(() => {
        const pending = currentProjectId ? pendingProjectEdits[currentProjectId]?.discount : undefined;
        const committed = activeProject?.discount ?? 0;
        setLocalDiscount((pending !== undefined ? pending : committed).toString());
    }, [activeProject?.id, activeProject?.discount, pendingProjectEdits]);

    const displayTerms = useMemo(() => {
        if (!activeProject || !selectedVersionId) return '';

        // 1. Check for unsaved edits
        if (versionEdits && versionEdits[selectedVersionId]?.termsConditions !== undefined) {
            return versionEdits[selectedVersionId].termsConditions || '';
        }

        // 2. Fallback to persisted version data
        const ver = activeProject.versions.find(v => v.id === selectedVersionId);
        return ver?.termsConditions || '';
    }, [activeProject, selectedVersionId, versionEdits]);

    const activeItems = useMemo(() => {
        const rawItems = bqItems.filter(item => item.projectId === currentProjectId && item.versionId === selectedVersionId);
        const version = activeProject?.versions.find(v => v.id === selectedVersionId);
        const snapshot = version?.masterSnapshot || [];

        return rawItems.map(item => {
            if (item.masterId) {
                const master = snapshot.find(m => m.id === item.masterId);
                if (master) {
                    const price = getPriceValue(master.rexRsp) || 0;
                    return {
                        ...item,
                        rexScFob: master.rexScFob,
                        rexScDdp: master.rexScDdp,
                        rexSp: master.rexSp,
                        rexRsp: master.rexRsp,
                        price: price,
                        total: price * item.qty
                    };
                }
            }
            return item;
        });
    }, [bqItems, currentProjectId, selectedVersionId, activeProject]);

    // Calculate totals including discount
    const { subtotal, grandTotal, discount } = currentProjectId && selectedVersionId
        ? getProjectTotal(currentProjectId, selectedVersionId)
        : { subtotal: 0, grandTotal: 0, discount: 0 };
    // Use effectiveDiscount (pending buffer) so the totals panel updates live while typing
    // without needing a DB write. effectiveDiscount is defined below after pendingProjectEdits.

    // Separate Standard and Optional Items
    const standardItems = useMemo(() => activeItems.filter(item => !item.isOptional), [activeItems]);
    const optionalItems = useMemo(() => activeItems.filter(item => item.isOptional), [activeItems]);

    // Group items by category (Standard)
    const groupedItems = useMemo(() => standardItems.reduce((acc, item) => {
        const cat = item.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, BQItem[]>), [standardItems]);

    const filteredProjects = useMemo(() => {
        let result = projects.filter(p =>
            p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.clientName.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Sort Logic
        return result.sort((a, b) => {
            let valA: string | number | Date = '';
            let valB: string | number | Date = '';

            if (sortConfig.key === 'date') {
                valA = new Date(a.date).getTime();
                valB = new Date(b.date).getTime();
            } else if (sortConfig.key === 'validityPeriod') {
                valA = Number(a.validityPeriod);
                valB = Number(b.validityPeriod);
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    }, [projects, searchQuery, sortConfig]);

    // Buffer discount in the store's pendingProjectEdits so saveAllChanges / discardAllChanges
    // correctly include or drop the change. No direct DB write here.
    const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setLocalDiscount(raw); // update visual input immediately
        if (!activeProject) return;
        const val = parseFloat(raw);
        setPendingProjectEdit(activeProject.id, { discount: isNaN(val) ? 0 : val });
    };

    // Effective discount for live totals: prefer buffered pending value over committed value
    const effectiveDiscount = (() => {
        if (!currentProjectId) return 0;
        const pending = pendingProjectEdits[currentProjectId]?.discount;
        if (pending !== undefined) return pending;
        return activeProject?.discount ?? 0;
    })();

    const handleSSTChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!activeProject) return;
        setPendingProjectEdit(activeProject.id, { sst: Number(e.target.value) });
    };

    const effectiveSST = (() => {
        if (!currentProjectId) return 0;
        const pending = pendingProjectEdits[currentProjectId]?.sst;
        if (pending !== undefined) return pending;
        return activeProject?.sst ?? 0;
    })();

    const createPdfDoc = useCallback(async () => {
        if (!activeProject || !selectedVersionId) {
            return null;
        }

        try {
            const doc = new jsPDF('p', 'mm', 'a4');

            // PDF Dimensions
            const pageWidth = 210;
            const pageHeight = 297;

            // Margins (Safe Zones)
            const marginTop = 7;
            const marginBottom = 7;
            const marginLeft = 10;
            const marginRight = 10;
            const contentWidth = pageWidth - marginLeft - marginRight;

            let currentY = marginTop;

            // =============================================
            // 1. HEADER SECTION (Page 1 Only)
            // =============================================

            // Helper to get image dimensions
            const getImageDimensions = (src: string): Promise<{ w: number, h: number, ratio: number }> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve({ w: img.width, h: img.height, ratio: img.width / img.height });
                    img.onerror = reject;
                    img.src = src;
                });
            };

            // Company Logo (if exists)
            if (appSettings.companyLogo) {
                try {
                    // Load image to get dimensions
                    const dims = await getImageDimensions(appSettings.companyLogo);
                    const maxHeight = 16; // Max height 16mm
                    const maxWidth = 50;  // Max width 50mm

                    let finalW = dims.ratio * maxHeight;
                    let finalH = maxHeight;

                    if (finalW > maxWidth) {
                        finalW = maxWidth;
                        finalH = maxWidth / dims.ratio;
                    }

                    doc.addImage(appSettings.companyLogo, 'PNG', marginLeft, currentY, finalW, finalH);
                } catch (e) {
                    console.warn("Failed to load company logo:", e);
                }
            }

            // QUOTE Title (right aligned)
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('QUOTE', pageWidth - marginRight, currentY + 10, { align: 'right' }); // Moved up (was +10)

            currentY += 20;

            // Company Name
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 38, 38); // Red color
            doc.text(appSettings.companyName, marginLeft, currentY);
            currentY += 6;

            // Company Address
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            const addressLines = appSettings.companyAddress.split('\n');
            addressLines.forEach(line => {
                doc.text(line, marginLeft, currentY);
                currentY += 4;
            });

            currentY += 2;

            // Bill To / Quote Reference Section
            const leftColX = marginLeft;
            const rightColX = marginLeft + contentWidth * 0.58;
            const refY = currentY;

            // Bill To Section
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('BILL / SHIP TO:', leftColX, refY);
            doc.line(leftColX, refY + 1, leftColX + 25, refY + 1);

            let billY = refY + 6;
            doc.setFontSize(8);
            doc.text('Attn to:', leftColX, billY);
            doc.setFont('helvetica', 'normal');
            doc.text((activeProject.clientContact || 'N/A').toUpperCase(), leftColX + 20, billY);
            billY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Client:', leftColX, billY);
            doc.setFont('helvetica', 'normal');
            doc.text(activeProject.clientName.toUpperCase(), leftColX + 20, billY);
            billY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Address:', leftColX, billY);
            doc.setFont('helvetica', 'normal');
            const clientAddressLines = activeProject.clientAddress.split('\n');
            clientAddressLines.forEach((line, idx) => {
                doc.text(line, leftColX + 20, billY + (idx * 4));
            });

            // Quote Reference Section
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('QUOTE REFERENCE:', rightColX, refY);
            doc.line(rightColX, refY + 1, rightColX + 35, refY + 1);

            let quoteY = refY + 6;
            doc.setFontSize(8);
            doc.text('Quote #:', rightColX, quoteY);
            doc.setFont('helvetica', 'normal');
            doc.text(activeProject.quoteId, rightColX + 20, quoteY);
            quoteY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Date:', rightColX, quoteY);
            doc.setFont('helvetica', 'normal');
            doc.text(activeProject.date, rightColX + 20, quoteY);
            quoteY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Valid for:', rightColX, quoteY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${activeProject.validityPeriod} Days`, rightColX + 20, quoteY);
            quoteY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Issued by:', rightColX, quoteY);
            doc.setFont('helvetica', 'normal');
            doc.text(appSettings.profileName, rightColX + 20, quoteY);
            quoteY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Contact:', rightColX, quoteY);
            doc.setFont('helvetica', 'normal');
            doc.text(appSettings.profileContact, rightColX + 20, quoteY);

            currentY = Math.max(billY + (clientAddressLines.length * 4), quoteY) + 5;

            // =============================================
            // 2. ITEMS TABLE (using autoTable)
            // =============================================

            // Prepare table data
            const tableData: any[] = [];
            let rowNumber = 1;

            // Standard Items
            Object.entries(groupedItems).forEach(([category, items]) => {
                // Category header row
                tableData.push([
                    { content: '', styles: { fillColor: [200, 200, 200] } },
                    { content: category.toUpperCase(), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'left' } }
                ]);

                // Item rows
                (items as BQItem[]).forEach(item => {
                    const displayDescription = bqItemEdits[item.id]?.description ?? item.description;
                    tableData.push([
                        rowNumber++,
                        item.itemName,
                        displayDescription,
                        formatNumber(item.price),
                        item.qty,
                        item.uom,
                        formatNumber(item.total)
                    ]);
                });
            });

            // Render table with autoTable
            autoTable(doc, {
                startY: currentY,
                head: [[
                    'NO',
                    'ITEM',
                    'DESCRIPTION',
                    `Unit Price (${appSettings.currencySymbol})`,
                    'QTY',
                    'UOM',
                    `Total Price (${appSettings.currencySymbol})`
                ]],
                body: tableData,
                theme: 'grid',
                showHead: 'firstPage', // Only show header on first page
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.1,
                    textColor: [0, 0, 0]
                },
                headStyles: {
                    fillColor: [240, 240, 240],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 7
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { halign: 'left', cellWidth: 35 },
                    2: { halign: 'left', cellWidth: 'auto' },
                    3: { halign: 'right', cellWidth: 25 },
                    4: { halign: 'center', cellWidth: 12 },
                    5: { halign: 'center', cellWidth: 15 },
                    6: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
                },
                margin: { left: marginLeft, right: marginRight }
            });

            // Get position after table
            currentY = (doc as any).lastAutoTable.finalY + 5;

            // =============================================
            // 3. TOTALS SECTION
            // =============================================

            const totalsHeight = 35; // Estimated height for totals block

            // Check if totals fit on current page
            if (currentY + totalsHeight > pageHeight - marginBottom) {
                doc.addPage();
                currentY = marginTop * 2;
            }

            const totalsWidth = 80;
            const totalsX = pageWidth - marginRight - totalsWidth;

            // Subtotal
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`Subtotal (${appSettings.currencySymbol}):`, totalsX, currentY, { align: 'left' });
            doc.text(formatNumber(subtotal), totalsX + totalsWidth, currentY, { align: 'right' });
            currentY += 6;

            const postDiscountTotal = subtotal - effectiveDiscount;

            // Special Discount (if applicable)
            if (effectiveDiscount > 0) {
                doc.text(`Special Discount (${appSettings.currencySymbol}):`, totalsX, currentY, { align: 'left' });
                doc.text(`- ${formatNumber(effectiveDiscount)}`, totalsX + totalsWidth, currentY, { align: 'right' });
                currentY += 4;

                // Big Underline
                doc.setLineWidth(0.5);
                doc.line(totalsX, currentY, totalsX + totalsWidth, currentY);
                doc.setLineWidth(0.1);
                currentY += 5;

                // Total After Discount
                doc.text(`Total After Discount (${appSettings.currencySymbol}):`, totalsX, currentY, { align: 'left' });
                doc.text(formatNumber(postDiscountTotal), totalsX + totalsWidth, currentY, { align: 'right' });
                currentY += 6;
            }

            // SST
            if (effectiveSST > 0) {
                const sstAmount = postDiscountTotal * (effectiveSST / 100);
                doc.text(`SST of ${effectiveSST}%:`, totalsX, currentY, { align: 'left' });
                doc.text(formatNumber(sstAmount), totalsX + totalsWidth, currentY, { align: 'right' });
                currentY += 4;
            } else {
                currentY -= 2;
            }

            // Standard Underline
            doc.line(totalsX, currentY, totalsX + totalsWidth, currentY);
            currentY += 5;

            // Grand Total
            const finalTotal = postDiscountTotal * (1 + effectiveSST / 100);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            const totalLabel = effectiveSST > 0 ? `TOTAL INCLUSIVE SST (${appSettings.currencySymbol}):` : `TOTAL (${appSettings.currencySymbol}):`;
            doc.text(totalLabel, totalsX, currentY, { align: 'left' });
            doc.text(formatNumber(finalTotal), totalsX + totalsWidth, currentY, { align: 'right' });
            currentY += 10;

            // =============================================
            // 3.5 OPTIONAL ITEMS TABLE
            // =============================================
            if (optionalItems.length > 0) {
                const optionalTableData: any[] = [];
                optionalTableData.push([
                    { content: '', styles: { fillColor: [200, 200, 200] } },
                    { content: 'OPTIONAL ITEMS', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [230, 230, 230], halign: 'center' } }
                ]);

                optionalItems.forEach(item => {
                    const displayDescription = bqItemEdits[item.id]?.description ?? item.description;
                    optionalTableData.push([
                        rowNumber++,
                        item.itemName,
                        displayDescription,
                        formatNumber(item.price),
                        item.qty,
                        item.uom,
                        formatNumber(item.total)
                    ]);
                });

                autoTable(doc, {
                    startY: currentY,
                    head: [[
                        'NO',
                        'ITEM',
                        'DESCRIPTION',
                        `Unit Price (${appSettings.currencySymbol})`,
                        'QTY',
                        'UOM',
                        `Total Price (${appSettings.currencySymbol})`
                    ]],
                    body: optionalTableData,
                    theme: 'grid',
                    showHead: 'never',
                    styles: {
                        fontSize: 8,
                        cellPadding: 2,
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1,
                        textColor: [0, 0, 0]
                    },
                    headStyles: {
                        fillColor: [240, 240, 240],
                        textColor: [0, 0, 0],
                        fontStyle: 'bold',
                        halign: 'center',
                        fontSize: 7
                    },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 10 },
                        1: { halign: 'left', cellWidth: 35 },
                        2: { halign: 'left', cellWidth: 'auto' },
                        3: { halign: 'right', cellWidth: 25 },
                        4: { halign: 'center', cellWidth: 12 },
                        5: { halign: 'center', cellWidth: 15 },
                        6: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }
                    },
                    margin: { left: marginLeft, right: marginRight }
                });

                currentY = (doc as any).lastAutoTable.finalY + 5;
            }

            // =============================================
            // 4. TERMS & CONDITIONS (Keep-Together Block)
            // =============================================

            const tncHeight = 20; // Estimated height for T&C block

            // Check if T&C fits on current page
            if (currentY + tncHeight > pageHeight - marginBottom) {
                doc.addPage();
                currentY = marginTop * 2;
            }

            // Terms & Conditions Header
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('TERMS & CONDITIONS:', marginLeft, currentY);
            doc.line(marginLeft, currentY + 1, marginLeft + 60, currentY + 1);
            currentY += 6;

            // Terms Content
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const termsLines = doc.splitTextToSize(displayTerms || 'N/A', contentWidth);
            doc.text(termsLines, marginLeft, currentY);
            currentY += (termsLines.length * 4) + 1;

            // =============================================
            // 5. SIGNATURE SECTION (Keep-Together Block)
            // =============================================

            const signatureHeight = 40; // Estimated height for signature block

            // Check if signature fits on current page
            if (currentY + signatureHeight > pageHeight - marginBottom) {
                doc.addPage();
                currentY = marginTop * 2;
            }

            // Thank you message & instruction
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text('Thank you for your business,', marginLeft, currentY);
            doc.setFont('helvetica', 'bold');
            doc.text('Sign and return to confirm your order.', pageWidth - marginRight - 40, currentY, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            currentY += 20;

            // Signature boxes
            const leftSigX = marginLeft;
            const rightSigX = pageWidth - marginRight - 75;
            const sigY = currentY;

            // Left signature (Company)
            doc.line(leftSigX, sigY, leftSigX + 75, sigY);
            currentY = sigY + 4;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(appSettings.companyName, leftSigX, currentY);
            currentY += 4;

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(37, 99, 235); // Blue
            doc.text(appSettings.companyEmail || 'email@example.com', leftSigX, currentY);
            doc.setTextColor(0, 0, 0);
            currentY += 6;

            doc.setFont('helvetica', 'italic');
            doc.text('All cheques should be crossed and made to:', leftSigX, currentY);
            currentY += 4;
            doc.setFont('helvetica', 'bold');
            doc.text(appSettings.companyName, leftSigX, currentY);
            currentY += 4;
            doc.setFont('helvetica', 'normal');
            doc.text(`Bank Name: ${appSettings.bankName}`, leftSigX, currentY);
            currentY += 4;
            doc.text(`Bank Account: ${appSettings.bankAccount}`, leftSigX, currentY);

            // Add signature image if exists
            if (appSettings.profileSignature) {
                try {
                    doc.addImage(appSettings.profileSignature, 'PNG', leftSigX, sigY - 18, 30, 15);
                } catch (e) {
                    console.warn("Failed to load signature:", e);
                }
            }

            // Right signature (Client)
            doc.line(rightSigX, sigY, rightSigX + 75, sigY);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('Company Stamp', rightSigX, sigY + 4);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6);
            doc.text('(if any)', rightSigX, sigY + 8);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text('Authorized Signature', rightSigX + 60, sigY + 6, { align: 'right' });

            doc.text('Name:', rightSigX, sigY + 18);
            doc.text('Mobile:', rightSigX, sigY + 26);

            return doc;
        } catch (err) {
            console.error("PDF Generation Failed", err);
            return null;
        }
    }, [
        activeProject,
        selectedVersionId,
        appSettings,
        groupedItems,
        optionalItems,
        subtotal,
        effectiveDiscount,
        effectiveSST,
        bqItemEdits,
        displayTerms
    ]);

    useEffect(() => {
        let active = true;
        let urlToRevoke: string | null = null;

        const buildPdf = async () => {
            if (!activeProject || !selectedVersionId) {
                setPdfPreviewUrl(null);
                return;
            }

            const doc = await createPdfDoc();
            if (!active) return;

            if (doc) {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                urlToRevoke = url;
                setPdfPreviewUrl(url);
            } else {
                setPdfPreviewUrl(null);
            }
        };

        buildPdf();

        return () => {
            active = false;
            if (urlToRevoke) {
                URL.revokeObjectURL(urlToRevoke);
            }
        };
    }, [createPdfDoc, activeProject, selectedVersionId]);

    const handleExportPDF = async () => {
        if (hasUnsavedChanges) {
            alert("Please save your changes before exporting.");
            return;
        }

        if (!activeProject || !selectedVersionId) {
            alert("No project or version selected.");
            return;
        }

        try {
            const doc = await createPdfDoc();
            if (doc) {
                doc.save(`Quotation-${activeProject.quoteId || 'draft'}.pdf`);
            } else {
                alert("Failed to generate PDF. Please try again.");
            }
        } catch (err) {
            console.error("PDF Export Failed", err);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const contentPadding = !isSidebarOpen ? 'pl-4 md:pl-24 pr-4' : 'px-4';


    // Global row counter for pagination
    let globalRowCounter = 1;

    if (!currentProjectId) {
        return (
            <div className={`space-y-6 animate-fade-in pb-20 transition-all duration-300 ${contentPadding}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{t.quotationView}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Select a project to view and export quotation</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t.searchProjects}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white"
                        />
                    </div>
                    <div className="relative min-w-[180px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <ArrowUpDown size={16} />
                        </div>
                        <select
                            value={`${sortConfig.key}-${sortConfig.direction}`}
                            onChange={(e) => {
                                const [key, direction] = e.target.value.split('-');
                                setSortConfig({ key: key as SortKey, direction: direction as SortDirection });
                            }}
                            className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-white appearance-none cursor-pointer"
                        >
                            <option value="date-desc">Newest Date First</option>
                            <option value="date-asc">Oldest Date First</option>
                            <option value="validityPeriod-desc">Longest Validity</option>
                            <option value="validityPeriod-asc">Shortest Validity</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Project List */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => {
                                setCurrentProjectId(project.id);
                                if (project.versions.length > 0) {
                                    setCurrentVersionId(project.versions[project.versions.length - 1].id);
                                } else {
                                    setCurrentVersionId(null);
                                }
                            }}
                            className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-xl">
                                    <FileText size={24} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors">{project.projectName}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                                <User size={14} /> {project.clientName}
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-slate-700 pt-4 mt-2">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">{t.date}</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Calendar size={12} /> {project.date}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">{t.validityPeriod}</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Clock size={12} /> {project.validityPeriod} Days
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {filteredProjects.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                            <AlertCircle size={48} className="mb-4 opacity-50" />
                            <p>No projects found. Go to BQ Builder to create one.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // === DETAIL VIEW ===
    return (
        <div className="animate-fade-in space-y-6 pb-12 flex flex-col h-[calc(100vh-3.5rem)]">
            {/* Title Header */}
            <div className={`transition-all duration-300 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 ${contentPadding}`}>
                <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => {
                                if (hasUnsavedChanges) {
                                    if (window.confirm("You have unsaved changes. Discard them?")) {
                                        discardAllChanges();
                                        setCurrentProjectId(null);
                                        setCurrentVersionId(null);
                                        setSelectedVersionId(null);
                                    }
                                } else {
                                    setCurrentProjectId(null);
                                    setCurrentVersionId(null);
                                    setSelectedVersionId(null);
                                }
                            }}
                            className="mt-1 p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Back to Projects"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{t.quotationView}</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Project: {activeProject?.projectName}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full xl:w-auto">
                    {/* Version Selection */}
                    <div className="flex flex-col items-end sm:items-start">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Select Version to Export</label>
                        <div className="relative inline-block">
                            <select
                                value={selectedVersionId || ''}
                                onChange={(e) => {
                                    if (hasUnsavedChanges) {
                                        if (!window.confirm("Changing version will discard unsaved changes. Continue?")) return;
                                        discardAllChanges();
                                    }
                                    const newVersionId = e.target.value;
                                    setSelectedVersionId(newVersionId);
                                    setCurrentVersionId(newVersionId);
                                }}
                                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none font-medium min-w-[160px]"
                            >
                                {activeProject?.versions.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    {/* Discount Input */}
                    <div className="flex flex-col items-end sm:items-start">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Special Discount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">{appSettings.currencySymbol}</span>
                            <input
                                type="number"
                                value={localDiscount}
                                onChange={handleDiscountChange}
                                placeholder="0.00"
                                className="w-32 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium text-right"
                            />
                        </div>
                    </div>

                    {/* SST Selection */}
                    <div className="flex flex-col items-end sm:items-start">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">SELECT SST TO APPLY</label>
                        <div className="relative inline-block">
                            <select
                                value={effectiveSST}
                                onChange={handleSSTChange}
                                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none font-medium min-w-[100px]"
                            >
                                <option value={0}>0%</option>
                                <option value={6}>6%</option>
                                <option value={8}>8%</option>
                                <option value={10}>10%</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4 sm:mt-0">
                        {/* Undo Button */}
                        <button
                            onClick={discardAllChanges}
                            disabled={!hasUnsavedChanges}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-sm transition-colors border ${hasUnsavedChanges
                                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:bg-gray-50'
                                : 'bg-gray-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed'
                                }`}
                            title="Undo Changes"
                        >
                            <RotateCcw size={20} />
                        </button>

                        {/* Save Button */}
                        <button
                            onClick={saveAllChanges}
                            disabled={!hasUnsavedChanges}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-sm transition-colors border ${hasUnsavedChanges
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100'
                                : 'bg-gray-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed'
                                }`}
                            title="Save Changes"
                        >
                            <Save size={20} />
                        </button>

                        {/* Export Button */}
                        <button
                            onClick={handleExportPDF}
                            disabled={hasUnsavedChanges}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-lg transition-colors ${hasUnsavedChanges
                                ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 cursor-not-allowed'
                                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                                }`}
                            title={hasUnsavedChanges ? "Save changes to enable export" : t.exportPDF}
                        >
                            <Download size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {!pdfPreviewUrl ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in flex-1">
                    <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                        <FileText size={48} className="text-slate-400 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Generating PDF Preview...</h2>
                </div>
            ) : (
                <div className="flex-1 w-full bg-gray-200 dark:bg-slate-950 overflow-hidden flex justify-center">
                    <iframe
                        src={`${pdfPreviewUrl}#toolbar=0`}
                        className="w-full max-w-[210mm] h-full bg-white shadow-2xl border-none"
                        title="PDF Preview"
                    />
                </div>
            )}
        </div>
    );
};

export default QuotationView;
