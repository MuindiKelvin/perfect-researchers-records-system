import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Card, Table, Badge, InputGroup, Modal, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import { Chart } from 'react-google-charts';
import { Search, Calendar, RefreshCw, Upload, ArrowUpDown, Edit3, DollarSign } from 'lucide-react';

const Dissertations = () => {
  const initialDissertationState = {
    projectName: '',
    orderDate: '',
    submissionDate: '',
    supervisorName: '',
    season: '',
    status: 'Pending',
    type: 'Dissertation',
    budget: '',
    wordCount: '',
    hasCode: false,
    cpp: '425', // Higher default for dissertations
    codePrice: '10000', // Higher default for dissertations
    progress: 0,
    wordsPaid: 0,
    remainingBalance: 0,
    isFullyPaid: false,
    datePaid: '',
    totalPaid: 0,
  };

  const [dissertation, setDissertation] = useState(initialDissertationState);
  const [dissertations, setDissertations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showGanttModal, setShowGanttModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDissertation, setSelectedDissertation] = useState(null);
  const [paymentData, setPaymentData] = useState({
    wordsPaid: 0,
    amountPaid: 0,
    datePaid: '',
    isFullyPaid: false
  });
  const [importFile, setImportFile] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState({
    projectName: true,
    supervisorName: true,
    status: true,
    season: true,
    hasCode: true,
    budget: true,
    totalPaid: true,
    remainingBalance: true,
    progress: true,
    submissionDate: true,
    orderDate: true,
    wordCount: true,
    cpp: true,
    codePrice: true,
    isFullyPaid: true,
    datePaid: true
  });

  useEffect(() => {
    fetchDissertations();
  }, []);

  useEffect(() => {
    const filtered = dissertations.filter(diss => {
      const matchesSearch =
        diss.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diss.supervisorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diss.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diss.season?.toLowerCase().includes(searchTerm.toLowerCase());

      const dissertationDate = new Date(diss.submissionDate);
      const matchesDateRange =
        (!dateRange.start || dissertationDate >= new Date(dateRange.start)) &&
        (!dateRange.end || dissertationDate <= new Date(dateRange.end));

      return matchesSearch && matchesDateRange;
    });
    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [searchTerm, dissertations, dateRange]);

  const calculateBudget = (wordCount, cpp, hasCode, codePrice) => {
    const pages = wordCount / 275;
    const baseBudget = pages * cpp;
    return hasCode ? baseBudget + codePrice : baseBudget;
  };

  const calculateRemainingBalance = (totalBudget, totalPaid) => {
    return Math.max(0, totalBudget - totalPaid);
  };

  const isOverdue = (orderDate, submissionDate) => {
    const today = new Date();
    const submission = new Date(submissionDate);
    const order = new Date(orderDate);
    
    const diffTime = Math.abs(submission - order);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return submission < today && diffDays > 0;
  };

  const handleBudgetInputChange = (e, field) => {
    const value = e.target.value === "0" ? 0 : parseFloat(e.target.value) || 0;
    setDissertation(prev => {
      const updates = { [field]: value };
      const wordCount = prev.wordCount || 0;
      const cpp = field === 'cpp' ? value : prev.cpp;
      const codePrice = field === 'codePrice' ? value : prev.codePrice;
      const totalBudget = calculateBudget(wordCount, cpp, prev.hasCode, codePrice);
      updates.budget = totalBudget;
      updates.remainingBalance = calculateRemainingBalance(totalBudget, prev.totalPaid || 0);
      return { ...prev, ...updates };
    });
  };

  const handleWordCountChange = (e) => {
    const wordCount = parseInt(e.target.value) || 0;
    setDissertation(prev => {
      const totalBudget = calculateBudget(wordCount, prev.cpp, prev.hasCode, prev.codePrice);
      return {
        ...prev,
        wordCount,
        budget: totalBudget,
        remainingBalance: calculateRemainingBalance(totalBudget, prev.totalPaid || 0),
      };
    });
  };

  const handleCodeToggle = (e) => {
    const hasCode = e.target.checked;
    setDissertation(prev => {
      const totalBudget = calculateBudget(prev.wordCount || 0, prev.cpp, hasCode, prev.codePrice);
      return {
        ...prev,
        hasCode,
        budget: totalBudget,
        remainingBalance: calculateRemainingBalance(totalBudget, prev.totalPaid || 0),
      };
    });
  };

  const fetchDissertations = async () => {
    try {
      const dissertationsRef = collection(db, 'dissertations');
      const q = query(dissertationsRef, orderBy('submissionDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const dissertationList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDissertations(dissertationList);
    } catch (error) {
      console.error('Error fetching dissertations:', error);
      alert('Error fetching dissertations');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dissertation.projectName || !dissertation.orderDate || !dissertation.submissionDate || 
        !dissertation.supervisorName || !dissertation.season || dissertation.wordCount === "" || 
        dissertation.cpp === "" || dissertation.codePrice === "") {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const calculatedBudget = calculateBudget(
        parseInt(dissertation.wordCount),
        parseFloat(dissertation.cpp),
        dissertation.hasCode,
        parseFloat(dissertation.codePrice)
      );

      const dissertationData = {
        ...dissertation,
        projectName: dissertation.projectName.trim(),
        supervisorName: dissertation.supervisorName.trim(),
        season: dissertation.season.trim(),
        budget: calculatedBudget,
        wordCount: parseInt(dissertation.wordCount),
        cpp: parseFloat(dissertation.cpp),
        codePrice: parseFloat(dissertation.codePrice),
        progress: Number(dissertation.progress),
        wordsPaid: Number(dissertation.wordsPaid) || 0,
        totalPaid: Number(dissertation.totalPaid) || 0,
        remainingBalance: calculateRemainingBalance(calculatedBudget, Number(dissertation.totalPaid) || 0),
      };

      if (editingId) {
        const dissertationRef = doc(db, 'dissertations', editingId);
        await updateDoc(dissertationRef, dissertationData);
      } else {
        await addDoc(collection(db, 'dissertations'), dissertationData);
      }

      setDissertation(initialDissertationState);
      setEditingId(null);
      setShowFormModal(false);
      await fetchDissertations();
      alert(`Dissertation ${editingId ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Error saving dissertation:', error);
      alert(`Error ${editingId ? 'updating' : 'adding'} dissertation: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this dissertation?')) {
      try {
        await deleteDoc(doc(db, 'dissertations', id));
        await fetchDissertations();
        alert('Dissertation deleted successfully!');
      } catch (error) {
        console.error('Error deleting dissertation:', error);
        alert('Error deleting dissertation');
      }
    }
  };

  const handleEdit = (dissertationToEdit) => {
    setDissertation({
      ...dissertationToEdit,
      budget: dissertationToEdit.budget?.toString() ?? '0',
      wordCount: dissertationToEdit.wordCount?.toString() ?? '0',
      cpp: dissertationToEdit.cpp?.toString() ?? '425',
      codePrice: dissertationToEdit.codePrice?.toString() ?? '10000',
      progress: dissertationToEdit.progress || 0,
      wordsPaid: dissertationToEdit.wordsPaid || 0,
      totalPaid: dissertationToEdit.totalPaid || 0,
      remainingBalance: dissertationToEdit.remainingBalance || 0,
    });
    setEditingId(dissertationToEdit.id);
    setShowFormModal(true);
  };

  const handlePaymentUpdate = (diss) => {
    setSelectedDissertation(diss);
    setPaymentData({
      wordsPaid: diss.wordsPaid || 0,
      amountPaid: diss.totalPaid || 0,
      datePaid: diss.datePaid || '',
      isFullyPaid: diss.isFullyPaid || false
    });
    setShowPaymentModal(true);
  };

  const updatePayment = async () => {
    try {
      const dissertationRef = doc(db, 'dissertations', selectedDissertation.id);
      const updatedData = {
        wordsPaid: Number(paymentData.wordsPaid),
        totalPaid: Number(paymentData.amountPaid),
        datePaid: paymentData.datePaid,
        isFullyPaid: paymentData.isFullyPaid,
        remainingBalance: calculateRemainingBalance(selectedDissertation.budget, Number(paymentData.amountPaid))
      };

      await updateDoc(dissertationRef, updatedData);
      await fetchDissertations();
      setShowPaymentModal(false);
      alert('Payment updated successfully!');
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Error updating payment');
    }
  };

  const exportToExcel = () => {
    setShowExportModal(true);
  };

  const handleExportConfirm = () => {
    const workbook = XLSX.utils.book_new();
    const exportData = filteredOrders.map(({ id, ...rest }) => {
      const row = {};
      if (selectedColumns.projectName) row['Dissertation Title'] = rest.projectName;
      if (selectedColumns.supervisorName) row['Writer'] = rest.supervisorName;
      if (selectedColumns.orderDate) row['Order Date'] = new Date(rest.orderDate).toLocaleDateString();
      if (selectedColumns.submissionDate) row['Submission Date'] = new Date(rest.submissionDate).toLocaleDateString();
      if (selectedColumns.status) row['Status'] = rest.status;
      if (selectedColumns.season) row['Season'] = rest.season;
      if (selectedColumns.budget) row['Total Amount'] = `Ksh.${rest.budget?.toLocaleString() ?? 0}`;
      if (selectedColumns.wordCount) row['Word Count'] = rest.wordCount?.toLocaleString() ?? '0';
      if (selectedColumns.hasCode) row['Has Code'] = rest.hasCode ? 'Yes' : 'No';
      if (selectedColumns.cpp) row['CPP'] = `Ksh.${rest.cpp?.toLocaleString() ?? 0}`;
      if (selectedColumns.codePrice) row['Code Price'] = `Ksh.${rest.codePrice?.toLocaleString() ?? 0}`;
      if (selectedColumns.progress) row['Progress'] = `${rest.progress}%`;
      if (selectedColumns.totalPaid) row['Amount Paid'] = `Ksh.${rest.totalPaid?.toLocaleString() ?? 0}`;
      if (selectedColumns.remainingBalance) row['Balance'] = `Ksh.${rest.remainingBalance?.toLocaleString() ?? 0}`;
      if (selectedColumns.isFullyPaid) row['Fully Paid'] = rest.isFullyPaid ? 'Yes' : 'No';
      if (selectedColumns.datePaid) row['Date Paid'] = rest.datePaid ? new Date(rest.datePaid).toLocaleDateString() : 'Not Paid';
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const totalAmount = filteredOrders.reduce((sum, diss) => sum + (diss.budget || 0), 0);
    const totalRow = filteredOrders.length + 3;
    const lastColIndex = Object.keys(exportData[0] || {}).length - 1;
    const totalCol = lastColIndex >= 0 ? String.fromCharCode(65 + lastColIndex + 2) : 'C';
    XLSX.utils.sheet_add_aoa(worksheet, [[`Total Amount: Ksh.${totalAmount.toLocaleString()}`]], { origin: `${totalCol}${totalRow}` });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dissertations');
    XLSX.writeFile(workbook, `dissertations_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportModal(false);
  };

  const getStatusBadgeVariant = (status, orderDate, submissionDate) => {
    if (isOverdue(orderDate, submissionDate) && status !== 'Completed') return 'danger';
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'warning';
      case 'Pending': return 'info';
      default: return 'secondary';
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortColumn) return 0;
    let valueA = a[sortColumn];
    let valueB = b[sortColumn];

    if (['orderDate', 'submissionDate', 'datePaid'].includes(sortColumn)) {
      valueA = new Date(valueA);
      valueB = new Date(valueB);
    } else if (['budget', 'wordCount', 'cpp', 'codePrice', 'progress', 'totalPaid', 'remainingBalance'].includes(sortColumn)) {
      valueA = Number(valueA);
      valueB = Number(valueB);
    }

    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = sortedOrders.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredOrders.length / recordsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleRefreshSearch = () => {
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleFileUpload = (e) => setImportFile(e.target.files[0]);

  const importOrders = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const importedData = XLSX.utils.sheet_to_json(sheet);

        for (const diss of importedData) {
          const budget = calculateBudget(
            Number(diss['Word Count']) || 0,
            Number(diss['CPP']) || 0,
            diss['Has Code'] === 'Yes' || diss['Has Code'] === true,
            Number(diss['Code Price']) || 10000
          );
          const totalPaid = Number(diss['Amount Paid']) || 0;
          await addDoc(collection(db, 'dissertations'), {
            projectName: diss['Dissertation Title'] || '',
            orderDate: diss['Order Date'] || '',
            submissionDate: diss['Submission Date'] || '',
            supervisorName: diss['Writer'] || '',
            season: diss['Season'] || '',
            status: diss['Status'] || 'Pending',
            type: 'Dissertation',
            budget,
            wordCount: Number(diss['Word Count']) || 0,
            hasCode: diss['Has Code'] === 'Yes' || diss['Has Code'] === true,
            cpp: Number(diss['CPP']) || 0,
            codePrice: Number(diss['Code Price']) || 10000,
            progress: Number(diss['Progress']) || 0,
            wordsPaid: Number(diss['Words Paid']) || 0,
            totalPaid,
            remainingBalance: calculateRemainingBalance(budget, totalPaid),
            datePaid: diss['Date Paid'] || '',
            isFullyPaid: diss['Fully Paid'] === 'Yes' || diss['Fully Paid'] === true,
          });
        }

        await fetchDissertations();
        setShowImportModal(false);
        setImportFile(null);
        alert('Dissertations imported successfully!');
      } catch (error) {
        console.error('Error importing dissertations:', error);
        alert('Error importing dissertations');
      }
    };
    reader.readAsArrayBuffer(importFile);
  };

  const handleColumnToggle = (column) => {
    setSelectedColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setDissertation(initialDissertationState);
    setEditingId(null);
  };

  const ganttData = [
    [
      { type: 'string', label: 'Task ID' },
      { type: 'string', label: 'Task Name' },
      { type: 'date', label: 'Start Date' },
      { type: 'date', label: 'End Date' },
      { type: 'number', label: 'Duration' },
      { type: 'number', label: 'Percent Complete' },
      { type: 'string', label: 'Dependencies' },
    ],
    ...filteredOrders.map(diss => [
      diss.id,
      diss.projectName,
      new Date(diss.orderDate),
      new Date(diss.submissionDate),
      null,
      diss.progress,
      null,
    ]),
  ];

  const ganttOptions = {
    height: 400,
    gantt: {
      trackHeight: 30,
      barHeight: 20,
      palette: [
        { color: '#28a745', dark: '#1e7e34' },
        { color: '#ffc107', dark: '#e0a800' },
        { color: '#17a2b8', dark: '#117a8b' },
      ],
    },
  };

  return (
    <Container className="py-4">
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h2 className="mb-0 fw-bold">
           <i className="bi bi-journal-bookmark-fill me-2"></i>  Dissertations 
        </h2>

        <div className="d-flex gap-3 align-items-center">
          <Button 
            variant="primary" 
            onClick={() => setShowFormModal(true)}
            className="px-4 py-2"
          >
            <i className="bi bi-plus-circle me-2"></i>Add a New Dissertation
          </Button>
          <Button 
            variant="outline-info" 
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2"
          >
            <Upload size={16} className="me-2" />Import Existing Dissertations
          </Button>
          <Button 
            variant="outline-success" 
            onClick={exportToExcel}
            className="px-4 py-2"
          >
            <i className="bi bi-download me-2"></i>Export to Excel
          </Button>
          <Button 
            variant="outline-primary" 
            onClick={() => setShowGanttModal(true)}
            className="px-4 py-2"
          >
            <i className="bi bi-bar-chart-line me-2"></i>Gantt Chart
          </Button>
        </div>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap gap-4 align-items-center">
            <InputGroup style={{ width: '250px' }}>
              <InputGroup.Text className="bg-light">
                <Search size={18} />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search dissertations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-start-0"
              />
            </InputGroup>
            <InputGroup style={{ width: '350px' }}>
              <InputGroup.Text className="bg-light">
                <Calendar size={18} />
              </InputGroup.Text>
              <Form.Control
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                placeholder="Start Date"
                className="border-start-0"
                style={{ width: '150px' }}
              />
              <Form.Control
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                placeholder="End Date"
                style={{ width: '150px' }}
              />
            </InputGroup>
            <Button 
              variant="outline-secondary" 
              onClick={handleRefreshSearch}
              title="Reset Filters"
              className="px-3 py-2"
            >
              <RefreshCw size={18} />
            </Button>
            <Form.Select
              style={{ width: '150px' }}
              value={recordsPerPage}
              onChange={(e) => {
                setRecordsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={15}>15 per page</option>
              <option value={20}>20 per page</option>
            </Form.Select>
          </div>
        </Card.Body>
      </Card>

      <div className="table-responsive">
        <Table bordered striped hover className="shadow-sm align-middle">
          <thead className="bg-primary text-white">
            <tr>
              <th className="py-3" style={{ width: '50px' }}>#</th>
              <th 
                className="py-3" 
                onClick={() => handleSort('projectName')} 
                style={{ cursor: 'pointer' }}
              >
                Dissertation Title{' '}
                {sortColumn === 'projectName' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('supervisorName')} 
                style={{ cursor: 'pointer' }}
              >
                Writer{' '}
                {sortColumn === 'supervisorName' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('status')} 
                style={{ cursor: 'pointer' }}
              >
                Status{' '}
                {sortColumn === 'status' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('season')} 
                style={{ cursor: 'pointer' }}
              >
                Season{' '}
                {sortColumn === 'season' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('hasCode')} 
                style={{ cursor: 'pointer' }}
              >
                Has Code{' '}
                {sortColumn === 'hasCode' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('budget')} 
                style={{ cursor: 'pointer' }}
              >
                Total Amount{' '}
                {sortColumn === 'budget' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('totalPaid')} 
                style={{ cursor: 'pointer' }}
              >
                Amount Paid{' '}
                {sortColumn === 'totalPaid' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('remainingBalance')} 
                style={{ cursor: 'pointer' }}
              >
                Balance{' '}
                {sortColumn === 'remainingBalance' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('progress')} 
                style={{ cursor: 'pointer' }}
              >
                Progress{' '}
                {sortColumn === 'progress' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('submissionDate')} 
                style={{ cursor: 'pointer' }}
              >
                Submission Date{' '}
                {sortColumn === 'submissionDate' && <ArrowUpDown size={14} />}
              </th>
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((diss, index) => (
              <tr key={diss.id}>
                <td>{indexOfFirstRecord + index + 1}</td>
                <td>{diss.projectName}</td>
                <td>{diss.supervisorName}</td>
                <td>
                  <Badge bg={getStatusBadgeVariant(diss.status, diss.orderDate, diss.submissionDate)}>
                    {diss.status}
                    {isOverdue(diss.orderDate, diss.submissionDate) && diss.status !== 'Completed' && ' (Overdue)'}
                  </Badge>
                </td>
                <td>{diss.season}</td>
                <td>
                  <Badge bg={diss.hasCode ? 'success' : 'secondary'}>
                    {diss.hasCode ? 'Yes' : 'No'}
                  </Badge>
                </td>
                <td>Ksh.{diss.budget?.toLocaleString() ?? 0}</td>
                <td>
                  <span className={diss.isFullyPaid ? 'text-success fw-bold' : ''}>
                    Ksh.{diss.totalPaid?.toLocaleString() ?? 0}
                    {diss.isFullyPaid && ' ✓'}
                  </span>
                </td>
                <td>
                  <span className={diss.remainingBalance > 0 ? 'text-danger fw-bold' : 'text-success'}>
                    Ksh.{diss.remainingBalance?.toLocaleString() ?? 0}
                  </span>
                </td>
                <td>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Progress: {diss.progress}%</Tooltip>}
                  >
                    <ProgressBar
                      now={diss.progress}
                      label={`${diss.progress}%`}
                      variant={diss.progress >= 75 ? 'success' : diss.progress >= 50 ? 'warning' : 'danger'}
                      style={{ height: '16px', cursor: 'pointer' }}
                    />
                  </OverlayTrigger>
                </td>
                <td>{new Date(diss.submissionDate).toLocaleDateString()}</td>
                <td>
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => handlePaymentUpdate(diss)}
                    className="me-2"
                    title="Update Payment"
                  >
                    <DollarSign size={14} />
                  </Button>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => handleEdit(diss)}
                    className="me-2"
                  >
                    <Edit3 size={14} />
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(diss.id)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {filteredOrders.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-4">
          <div className="text-muted">
            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredOrders.length)} of {filteredOrders.length} dissertations
          </div>
          <div className="d-flex align-items-center gap-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2"
            >
              Previous
            </Button>
            <span className="text-muted">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <Modal show={showFormModal} onHide={handleCloseFormModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit Dissertation' : 'Add New Dissertation'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Dissertation Title/Code <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={dissertation.projectName}
                    onChange={(e) => setDissertation({ ...dissertation, projectName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Season <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={dissertation.season}
                    onChange={(e) => setDissertation({ ...dissertation, season: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Order Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={dissertation.orderDate}
                    onChange={(e) => setDissertation({ ...dissertation, orderDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Submission Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={dissertation.submissionDate}
                    onChange={(e) => setDissertation({ ...dissertation, submissionDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Writer <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={dissertation.supervisorName}
                    onChange={(e) => setDissertation({ ...dissertation, supervisorName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={dissertation.status}
                    onChange={(e) => setDissertation({ ...dissertation, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Word Count <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    value={dissertation.wordCount}
                    onChange={handleWordCountChange}
                    required
                    min="0"
                    step="1"
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Cost Per Page <span className="text-danger">*</span></Form.Label>
                  <InputGroup>
                    <InputGroup.Text>Ksh.</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={dissertation.cpp}
                      onChange={(e) => handleBudgetInputChange(e, 'cpp')}
                      required
                      min="0"
                      step="1"
                    />
                  </InputGroup>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Code Price <span className="text-danger">*</span></Form.Label>
                  <InputGroup>
                    <InputGroup.Text>Ksh.</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={dissertation.codePrice}
                      onChange={(e) => handleBudgetInputChange(e, 'codePrice')}
                      required
                      min="0"
                      step="1"
                    />
                  </InputGroup>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Check
                    type="checkbox"
                    label="Includes Code"
                    checked={dissertation.hasCode}
                    onChange={handleCodeToggle}
                    className="mt-4"
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Total Amount</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>Ksh.</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={dissertation.budget}
                      readOnly
                      disabled
                    />
                  </InputGroup>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Amount Paid</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>Ksh.</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={dissertation.totalPaid}
                      onChange={(e) => setDissertation({ 
                        ...dissertation, 
                        totalPaid: e.target.value,
                        remainingBalance: calculateRemainingBalance(dissertation.budget, e.target.value)
                      })}
                      min="0"
                      step="1"
                    />
                  </InputGroup>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Progress (0-100%)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      min="0"
                      max="100"
                      value={dissertation.progress}
                      onChange={(e) => setDissertation({ ...dissertation, progress: e.target.value })}
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Words Paid</Form.Label>
                  <Form.Control
                    type="number"
                    value={dissertation.wordsPaid}
                    onChange={(e) => setDissertation({ ...dissertation, wordsPaid: e.target.value })}
                    min="0"
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Date Paid</Form.Label>
                  <Form.Control
                    type="date"
                    value={dissertation.datePaid}
                    onChange={(e) => setDissertation({ ...dissertation, datePaid: e.target.value })}
                  />
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseFormModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editingId ? 'Update Dissertation' : 'Add Dissertation'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Payment Update Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Payment - {selectedDissertation?.projectName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Words Paid</Form.Label>
                  <Form.Control
                    type="number"
                    value={paymentData.wordsPaid}
                    onChange={(e) => setPaymentData({ ...paymentData, wordsPaid: e.target.value })}
                    min="0"
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Amount Paid (Ksh)</Form.Label>
                  <Form.Control
                    type="number"
                    value={paymentData.amountPaid}
                    onChange={(e) => setPaymentData({ ...paymentData, amountPaid: e.target.value })}
                    min="0"
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Date Paid</Form.Label>
                  <Form.Control
                    type="date"
                    value={paymentData.datePaid}
                    onChange={(e) => setPaymentData({ ...paymentData, datePaid: e.target.value })}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Check
                    type="checkbox"
                    label="Fully Paid"
                    checked={paymentData.isFullyPaid}
                    onChange={(e) => setPaymentData({ ...paymentData, isFullyPaid: e.target.checked })}
                    className="mt-4"
                  />
                </Form.Group>
              </div>
              {selectedDissertation && (
                <div className="mt-3 p-3 bg-light rounded">
                  <h6>Payment Summary:</h6>
                  <p><strong>Total Amount:</strong> Ksh.${selectedDissertation.budget?.toLocaleString() ?? 0}</p>
                  <p><strong>Remaining Balance:</strong> Ksh.${calculateRemainingBalance(selectedDissertation.budget, paymentData.amountPaid)?.toLocaleString() ?? 0}</p>
                </div>
              )}
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={updatePayment}>
            Update Payment
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Gantt Chart Modal */}
      <Modal show={showGanttModal} onHide={() => setShowGanttModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Dissertation Timeline (Gantt Chart)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Chart
            chartType="Gantt"
            data={ganttData}
            options={ganttOptions}
            width="100%"
            height="400px"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGanttModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Bulk Import Dissertations</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Upload Excel File</Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <small className="text-muted">
              File should have columns: Dissertation Title, Order Date, Submission Date, Writer, Season, Status, Word Count, CPP, Code Price, Has Code, Progress, Amount Paid, Words Paid, Date Paid, Fully Paid
            </small>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={importOrders}>
            Import
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Export Columns Selection Modal */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Select Columns to Export</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {Object.keys(selectedColumns).map(column => (
              <Form.Check
                key={column}
                type="checkbox"
                label={column === 'supervisorName' ? 'Writer' : 
                      column === 'projectName' ? 'Dissertation Title' : 
                      column === 'budget' ? "Total Paid" : 
                      column === 'totalPaid' ? 'Amount Paid' : 
                      column === 'remainingBalance' ? 'Paid' : 
                      column === 'isFullyPaid' ? 'Fully Paid' : 
                      column === 'datePaid' ? 'Date Paid' : 
                      column.charAt(0).toUpperCase() + column.slice(1)}
                checked={selectedColumns[column]}
                onChange={() => handleColumnToggle(column)}
                className="mb-2"
              />
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExportConfirm}>
            Export
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Dissertations;