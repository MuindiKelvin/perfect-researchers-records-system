import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Card, Table, Badge, InputGroup, Modal, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, query, orderBy, where } from 'firebase/firestore';
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
  const [filteredDissertations, setFilteredDissertations] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showGanttModal, setShowGanttModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDissertation, setSelectedDissertation] = useState(null);
  const [paymentData, setPaymentData] = useState({
    wordsPaid: 0,
    amountPaid: 0,
    datePaid: '',
    isFullyPaid: false
  });
  const [importFile, setImportFile] = useState(null);

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
    setFilteredDissertations(filtered);
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
    
    // Calculate expected duration (dissertations typically need more time)
    const diffTime = Math.abs(submission - order);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If submission date has passed and status is not completed
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
      cpp: dissertationToEdit.cpp?.toString() ?? '300',
      codePrice: dissertationToEdit.codePrice?.toString() ?? '1000',
      progress: dissertationToEdit.progress || 0,
      wordsPaid: dissertationToEdit.wordsPaid || 0,
      totalPaid: dissertationToEdit.totalPaid || 0,
      remainingBalance: dissertationToEdit.remainingBalance || 0,
    });
    setEditingId(dissertationToEdit.id);
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
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      filteredDissertations.map(({ id, ...rest }) => ({
        ...rest,
        orderDate: new Date(rest.orderDate).toLocaleDateString(),
        submissionDate: new Date(rest.submissionDate).toLocaleDateString(),
        budget: `Ksh.${rest.budget?.toLocaleString() ?? 0}`,
        wordCount: rest.wordCount?.toLocaleString() ?? '0',
        hasCode: rest.hasCode ? 'Yes' : 'No',
        cpp: `Ksh.${rest.cpp?.toLocaleString() ?? 0}`,
        codePrice: `Ksh.${rest.codePrice?.toLocaleString() ?? 0}`,
        progress: `${rest.progress}%`,
        totalPaid: `Ksh.${rest.totalPaid?.toLocaleString() ?? 0}`,
        remainingBalance: `Ksh.${rest.remainingBalance?.toLocaleString() ?? 0}`,
        isFullyPaid: rest.isFullyPaid ? 'Yes' : 'No',
        datePaid: rest.datePaid ? new Date(rest.datePaid).toLocaleDateString() : 'Not Paid',
      }))
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dissertations');
    XLSX.writeFile(workbook, `dissertations_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  const sortedDissertations = [...filteredDissertations].sort((a, b) => {
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
  const currentRecords = sortedDissertations.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedDissertations.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRefreshSearch = () => {
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
  };

  // Gantt Chart Data
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
    ...filteredDissertations.map(diss => [
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
    <Container className="py-5">
      <Card className="mb-5 shadow-sm">
        <Card.Body>
          <Card.Title className="mb-4 d-flex justify-content-between align-items-center">
            {editingId ? 'Edit Dissertation' : 'Add New Dissertation'}
            <div>
              <Button variant="outline-info" size="sm" onClick={() => setShowImportModal(true)} className="me-2">
                <Upload size={16} className="me-2" />Bulk Import
              </Button>
              <Button variant="outline-primary" size="sm" onClick={() => setShowGanttModal(true)}>
                <i className="bi bi-bar-chart-line me-2"></i>Gantt Chart
              </Button>
            </div>
          </Card.Title>
          <Form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Dissertation Title/Code*</Form.Label>
                  <Form.Control
                    type="text"
                    value={dissertation.projectName}
                    onChange={(e) => setDissertation({ ...dissertation, projectName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Order Date*</Form.Label>
                  <Form.Control
                    type="date"
                    value={dissertation.orderDate}
                    onChange={(e) => setDissertation({ ...dissertation, orderDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Submission Date*</Form.Label>
                  <Form.Control
                    type="date"
                    value={dissertation.submissionDate}
                    onChange={(e) => setDissertation({ ...dissertation, submissionDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Writer Name*</Form.Label>
                  <Form.Control
                    type="text"
                    value={dissertation.supervisorName}
                    onChange={(e) => setDissertation({ ...dissertation, supervisorName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Season*</Form.Label>
                  <Form.Control
                    type="text"
                    value={dissertation.season}
                    onChange={(e) => setDissertation({ ...dissertation, season: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={dissertation.status}
                    onChange={(e) => setDissertation({ ...dissertation, status: e.target.value })}
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Word Count*</Form.Label>
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
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Progress (0-100%)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    value={dissertation.progress}
                    onChange={(e) => setDissertation({ ...dissertation, progress: e.target.value })}
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Includes Code"
                    checked={dissertation.hasCode}
                    onChange={handleCodeToggle}
                    className="mt-4"
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Cost Per Page (CPP)*</Form.Label>
                  <Form.Control
                    type="number"
                    value={dissertation.cpp}
                    onChange={(e) => handleBudgetInputChange(e, 'cpp')}
                    required
                    min="0"
                    step="1"
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Code Price*</Form.Label>
                  <Form.Control
                    type="number"
                    value={dissertation.codePrice}
                    onChange={(e) => handleBudgetInputChange(e, 'codePrice')}
                    required
                    min="0"
                    step="1"
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Total Amount</Form.Label>
                  <Form.Control
                    type="number"
                    value={dissertation.budget}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Amount Paid</Form.Label>
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
                </Form.Group>
              </div>
            </div>

            <div className="mt-3">
              <Button type="submit" variant="primary" className="me-2">
                {editingId ? 'Update Dissertation' : 'Add Dissertation'}
              </Button>
              {editingId && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDissertation(initialDissertationState);
                    setEditingId(null);
                  }}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Dissertations List</h3>
        <div className="d-flex gap-3 align-items-center">
          <InputGroup style={{ width: '300px' }}>
            <InputGroup.Text><Search size={20} /></InputGroup.Text>
            <Form.Control
              placeholder="Search dissertations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <InputGroup>
            <InputGroup.Text><Calendar size={20} /></InputGroup.Text>
            <Form.Control
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              placeholder="Start Date"
            />
            <Form.Control
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              placeholder="End Date"
            />
            <Button variant="outline-secondary" onClick={handleRefreshSearch} title="Reset Filters">
              <RefreshCw size={18} className="me-2" />Reset
            </Button>
          </InputGroup>
          <Form.Select
            style={{ width: '100px' }}
            value={recordsPerPage}
            onChange={(e) => {
              setRecordsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </Form.Select>
          <Button variant="success" onClick={exportToExcel}>
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover className="shadow-sm">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th onClick={() => handleSort('projectName')} style={{ cursor: 'pointer' }}>
                Dissertation Title{' '}
                {sortColumn === 'projectName' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('supervisorName')} style={{ cursor: 'pointer' }}>
                Writer{' '}
                {sortColumn === 'supervisorName' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                Status{' '}
                {sortColumn === 'status' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('season')} style={{ cursor: 'pointer' }}>
                Season{' '}
                {sortColumn === 'season' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('hasCode')} style={{ cursor: 'pointer' }}>
                Has Code{' '}
                {sortColumn === 'hasCode' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('budget')} style={{ cursor: 'pointer' }}>
                Total Amount{' '}
                {sortColumn === 'budget' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('totalPaid')} style={{ cursor: 'pointer' }}>
                Amount Paid{' '}
                {sortColumn === 'totalPaid' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('remainingBalance')} style={{ cursor: 'pointer' }}>
                Balance{' '}
                {sortColumn === 'remainingBalance' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('progress')} style={{ cursor: 'pointer' }}>
                Progress{' '}
                {sortColumn === 'progress' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('submissionDate')} style={{ cursor: 'pointer' }}>
                Submission Date{' '}
                {sortColumn === 'submissionDate' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th>Actions</th>
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
                      style={{ height: '20px', cursor: 'pointer' }}
                    />
                  </OverlayTrigger>
                </td>
                <td>{new Date(diss.submissionDate).toLocaleDateString()}</td>
                <td>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => handlePaymentUpdate(diss)}
                    className="me-1"
                    title="Update Payment"
                  >
                    <DollarSign size={14} />
                  </Button>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleEdit(diss)}
                    className="me-1"
                  >
                    <Edit3 size={14} />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(diss.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {filteredDissertations.length > recordsPerPage && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredDissertations.length)} of {filteredDissertations.length} dissertations
          </div>
          <nav>
            <ul className="pagination mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <Button variant="outline-primary" size="sm" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </Button>
              </li>
              {[...Array(totalPages)].map((_, i) => (
                <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                  <Button variant={currentPage === i + 1 ? 'primary' : 'outline-primary'} size="sm" onClick={() => paginate(i + 1)}>
                    {i + 1}
                  </Button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <Button variant="outline-primary" size="sm" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Payment Update Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Payment - {selectedDissertation?.projectName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
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
                <Form.Group className="mb-3">
                  <Form.Label>Amount Paid (Ksh)</Form.Label>
                  <Form.Control
                    type="number"
                    value={paymentData.amountPaid}
                    onChange={(e) => setPaymentData({ ...paymentData, amountPaid: e.target.value })}
                    min="0"
                  />
                </Form.Group>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Date Paid</Form.Label>
                  <Form.Control
                    type="date"
                    value={paymentData.datePaid}
                    onChange={(e) => setPaymentData({ ...paymentData, datePaid: e.target.value })}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Fully Paid"
                    checked={paymentData.isFullyPaid}
                    onChange={(e) => setPaymentData({ ...paymentData, isFullyPaid: e.target.checked })}
                    className="mt-4"
                  />
                </Form.Group>
              </div>
            </div>
            {selectedDissertation && (
              <div className="mt-3 p-3 bg-light rounded">
                <h6>Payment Summary:</h6>
                <p><strong>Total Amount:</strong> Ksh.{selectedDissertation.budget?.toLocaleString()}</p>
                <p><strong>Current Balance:</strong> Ksh.{calculateRemainingBalance(selectedDissertation.budget, paymentData.amountPaid)?.toLocaleString()}</p>
              </div>
            )}
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
      <Modal show={showGanttModal} onHide={() => setShowGanttModal(false)} size="xl">
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
              onChange={(e) => setImportFile(e.target.files[0])}
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
          <Button variant="primary" onClick={async () => {
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
          }}>
            Import
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Dissertations;