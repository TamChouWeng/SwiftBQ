
import React, { useMemo, useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, ArrowLeft, Search, Calendar, Clock, User, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store';
import { AppLanguage, BQItem, Project } from '../types';
import { TRANSLATIONS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  currentLanguage: AppLanguage;
  isSidebarOpen: boolean;
}

const QuotationView: React.FC<Props> = ({ currentLanguage, isSidebarOpen }) => {
  const { bqItems, currentProjectId, setCurrentProjectId, projects, appSettings } = useAppStore();
  const t = TRANSLATIONS[currentLanguage];
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for selecting version in Quotation View
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // --- LOCAL EDITABLE STATE ---
  // These states hold the data for the "Print View" only. 
  // Editing these does NOT affect the global store.
  const [localProject, setLocalProject] = useState<Project | null>(null);
  const [localItems, setLocalItems] = useState<BQItem[]>([]);
  const [localTerms, setLocalTerms] = useState<string[]>([
      "Payment : 50% deposit, balance before delivery.",
      "Delivery : 10 - 14 weeks upon order confirmation and deposit paid."
  ]);
  
  // Get current project details from STORE (for initial hydration)
  const activeProject = useMemo(() => 
    projects.find(p => p.id === currentProjectId), 
  [projects, currentProjectId]);

  // Set default version when project loads
  useEffect(() => {
    if (activeProject && !selectedVersionId && activeProject.versions.length > 0) {
        setSelectedVersionId(activeProject.versions[0].id);
    }
  }, [activeProject, selectedVersionId]);

  // Get active items from STORE (for initial hydration)
  const activeItems = useMemo(() => 
    bqItems.filter(item => item.projectId === currentProjectId && item.versionId === selectedVersionId),
  [bqItems, currentProjectId, selectedVersionId]);

  // --- HYDRATION EFFECTS ---
  
  // Hydrate Local Project when active project changes
  useEffect(() => {
      if (activeProject) {
          // Deep copy to break reference
          setLocalProject(JSON.parse(JSON.stringify(activeProject)));
      }
  }, [activeProject]);

  // Hydrate Local Items when active items change
  useEffect(() => {
      if (activeItems) {
          // Deep copy to break reference
          const itemsCopy = JSON.parse(JSON.stringify(activeItems));
          // Ensure totals are correct initially
          itemsCopy.forEach((i: any) => {
              i.total = i.price * i.qty;
          });
          setLocalItems(itemsCopy);
      }
  }, [activeItems]);

  // --- LOCAL ACTIONS ---

  const handleLocalProjectChange = (field: keyof Project, value: any) => {
      if (localProject) {
          setLocalProject({ ...localProject, [field]: value });
      }
  };

  const handleLocalItemChange = (id: string, field: keyof BQItem, value: any) => {
      setLocalItems(prev => prev.map(item => {
          if (item.id === id) {
              const updated = { ...item, [field]: value };
              // Recalculate item total if price or qty changes
              if (field === 'price' || field === 'qty') {
                  updated.total = Number(updated.price) * Number(updated.qty);
              }
              return updated;
          }
          return item;
      }));
  };

  const handleLocalTermChange = (index: number, value: string) => {
      const newTerms = [...localTerms];
      newTerms[index] = value;
      setLocalTerms(newTerms);
  };

  const addLocalTerm = () => {
      setLocalTerms([...localTerms, "New term condition..."]);
  };

  const removeLocalTerm = (index: number) => {
      setLocalTerms(localTerms.filter((_, i) => i !== index));
  };

  // --- LOCAL COMPUTATIONS ---
  // We calculate totals based on localItems, not the store
  const { subtotal, grandTotal, discount } = useMemo(() => {
      if (!localProject) return { subtotal: 0, grandTotal: 0, discount: 0 };
      
      const standardLocalItems = localItems.filter(i => !i.isOptional);
      const sub = standardLocalItems.reduce((acc, item) => acc + (item.total || 0), 0);
      const disc = Number(localProject.discount) || 0;
      const grand = sub - disc;
      
      return { subtotal: sub, grandTotal: grand, discount: disc };
  }, [localItems, localProject]);

  // Separate Standard and Optional Items (Local)
  const standardItems = useMemo(() => localItems.filter(item => !item.isOptional), [localItems]);
  const optionalItems = useMemo(() => localItems.filter(item => item.isOptional), [localItems]);

  // Group items by category (Standard)
  const groupedItems = standardItems.reduce<Record<string, BQItem[]>>((acc, item) => {
    const cat = item.category