import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Card, Table, Badge, InputGroup, Modal, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import { Search, Calendar, RefreshCw, Upload, ArrowUpDown } from 'lucide-react';

const NormalOrders = () => {
  const initialOrderState = {
    projectName: '',
    orderDate: '',
    submissionDate: '',
    supervisorName: '',
    season: '',
    status: 'Pending',
    budget: '',
    wordCount: '',
    hasCode: false,
    cpp: '',
    codePrice: '',
    progress: 0,
  };

  const [order, setOrder] = useState(initialOrderState);
  const [orders, setOrders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortColumn, setSortColumn] = useState('status');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState({
    projectName: true,
    supervisorName: true,
    orderDate: true,
    submissionDate: true,
    status: true,
    season: true,
    budget: true,
    wordCount: true,
    hasCode: true,
    cpp: true,
    codePrice: true,
    progress: true,
    isOverdue: true
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const filtered = orders.filter(ord => {
      const matchesSearch =
        ord.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.supervisorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.season?.toLowerCase().includes(searchTerm.toLowerCase());

      const orderDate = new Date(ord.orderDate);
      const matchesDateRange =
        (!dateRange.start || orderDate >= new Date(dateRange.start)) &&
        (!dateRange.end || orderDate <= new Date(dateRange.end));

      return matchesSearch && matchesDateRange;
    });
    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [searchTerm, orders, dateRange]);

  const calculateBudget = (wordCount, cpp, hasCode, codePrice) => {
    const pages = wordCount / 275;
    const baseBudget = pages * cpp;
    return hasCode ? baseBudget + codePrice : baseBudget;
  };

  const handleBudgetInputChange = (e, field) => {
    const value = e.target.value === "0" ? 0 : parseFloat(e.target.value) || 0;
    setOrder(prev => {
      const updates = { [field]: value };
      const wordCount = prev.wordCount || 0;
      const cpp = field === 'cpp' ? value : prev.cpp;
      const codePrice = field === 'codePrice' ? value : prev.codePrice;
      updates.budget = calculateBudget(wordCount, cpp, prev.hasCode, codePrice);
      return { ...prev, ...updates };
    });
  };

  const handleWordCountChange = (e) => {
    const wordCount = parseInt(e.target.value) || 0;
    setOrder(prev => ({
      ...prev,
      wordCount,
      budget: calculateBudget(wordCount, prev.cpp, prev.hasCode, prev.codePrice),
    }));
  };

  const handleCodeToggle = (e) => {
    const hasCode = e.target.checked;
    setOrder(prev => ({
      ...prev,
      hasCode,
      budget: calculateBudget(prev.wordCount || 0, prev.cpp, hasCode, prev.codePrice),
    }));
  };

  const fetchOrders = async () => {
    try {
      const ordersRef = collection(db, 'normalOrders');
      const q = query(ordersRef, orderBy('orderDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const orderList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(orderList);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Error fetching orders');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!order.projectName || !order.orderDate || !order.submissionDate || !order.supervisorName ||
        !order.season || order.wordCount === "" || order.cpp === "" || order.codePrice === "") {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const calculatedBudget = calculateBudget(
        parseInt(order.wordCount),
        parseFloat(order.cpp),
        order.hasCode,
        parseFloat(order.codePrice)
      );

      const orderData = {
        ...order,
        projectName: order.projectName.trim(),
        supervisorName: order.supervisorName.trim(),
        season: order.season.trim(),
        budget: calculatedBudget,
        wordCount: parseInt(order.wordCount),
        cpp: parseFloat(order.cpp),
        codePrice: parseFloat(order.codePrice),
        progress: Number(order.progress),
      };

      if (editingId) {
        const orderRef = doc(db, 'normalOrders', editingId);
        await updateDoc(orderRef, orderData);
      } else {
        await addDoc(collection(db, 'normalOrders'), orderData);
      }

      setOrder(initialOrderState);
      setEditingId(null);
      setShowFormModal(false);
      await fetchOrders();
      alert(`Order ${editingId ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Error saving order:', error);
      alert(`Error ${editingId ? 'updating' : 'adding'} order: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteDoc(doc(db, 'normalOrders', id));
        await fetchOrders();
        alert('Order deleted successfully!');
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order');
      }
    }
  };

  const handleEdit = (orderToEdit) => {
    setOrder({
      ...orderToEdit,
      budget: orderToEdit.budget?.toString() ?? '0',
      wordCount: orderToEdit.wordCount?.toString() ?? '0',
      cpp: orderToEdit.cpp?.toString() ?? '200',
      codePrice: orderToEdit.codePrice?.toString() ?? '500',
      progress: orderToEdit.progress || 0,
    });
    setEditingId(orderToEdit.id);
    setShowFormModal(true);
  };

  const exportToExcel = () => {
    setShowExportModal(true);
  };

  const handleExportConfirm = () => {
    const workbook = XLSX.utils.book_new();
    const exportData = filteredOrders.map(({ id, ...rest }) => {
      const row = {};
      if (selectedColumns.projectName) row['Project Name'] = rest.projectName;
      if (selectedColumns.supervisorName) row['Writer'] = rest.supervisorName;
      if (selectedColumns.orderDate) row['Order Date'] = new Date(rest.orderDate).toLocaleDateString();
      if (selectedColumns.submissionDate) row['Due Date'] = new Date(rest.submissionDate).toLocaleDateString();
      if (selectedColumns.status) row['Status'] = rest.status;
      if (selectedColumns.season) row['Season'] = rest.season;
      if (selectedColumns.budget) row['Total Amount'] = `Ksh.${rest.budget?.toLocaleString() ?? 0}`;
      if (selectedColumns.wordCount) row['Word Count'] = rest.wordCount?.toLocaleString() ?? '0';
      if (selectedColumns.hasCode) row['Has Code'] = rest.hasCode ? 'Yes' : 'No';
      if (selectedColumns.cpp) row['CPP'] = `Ksh.${rest.cpp?.toLocaleString() ?? 0}`;
      if (selectedColumns.codePrice) row['Code Price'] = `Ksh.${rest.codePrice?.toLocaleString() ?? 0}`;
      if (selectedColumns.progress) row['Progress'] = `${rest.progress}%`;
      if (selectedColumns.isOverdue) row['Overdue Status'] = isOverdue(rest.orderDate, rest.submissionDate, rest.status) ? 'Yes' : 'No';
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    const totalAmount = filteredOrders.reduce((sum, ord) => sum + (ord.budget || 0), 0);
    
    const totalRow = filteredOrders.length + 3;
    const lastColIndex = Object.keys(exportData[0] || {}).length - 1;
    const totalCol = lastColIndex >= 0 ? String.fromCharCode(65 + lastColIndex + 2) : 'C';
    XLSX.utils.sheet_add_aoa(worksheet, [[`Total Amount: Ksh.${totalAmount.toLocaleString()}`]], { origin: `${totalCol}${totalRow}` });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Normal Orders');
    XLSX.writeFile(workbook, `normal_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportModal(false);
  };

  const isOverdue = (orderDate, submissionDate, status) => {
    if (status === 'Completed') return false;
    const today = new Date();
    const submission = new Date(submissionDate);
    return submission < today;
  };

  const getStatusBadgeVariant = (status, orderDate, submissionDate) => {
    if (isOverdue(orderDate, submissionDate, status)) return 'danger';
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'warning';
      case 'Pending': return 'info';
      default: return 'secondary';
    }
  };

  const getPriorityScore = (order) => {
    const today = new Date();
    const submissionDate = new Date(order.submissionDate);
    const daysUntilDue = (submissionDate - today) / (1000 * 60 * 60 * 24);
    
    if (order.status === 'Completed') return 3; // Lowest priority
    if (isOverdue(order.orderDate, order.submissionDate, order.status)) return 0; // Highest priority for overdue
    if (daysUntilDue <= 3) return 1; // High priority for near-due (within 3 days)
    return 2; // Normal priority
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
    if (sortColumn === 'status') {
      // Primary sort by priority score
      const priorityA = getPriorityScore(a);
      const priorityB = getPriorityScore(b);
      
      if (priorityA !== priorityB) {
        return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      }
      
      // Secondary sort by submission date for same priority
      const dateA = new Date(a.submissionDate);
      const dateB = new Date(b.submissionDate);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }

    let valueA = a[sortColumn];
    let valueB = b[sortColumn];

    if (['orderDate', 'submissionDate'].includes(sortColumn)) {
      valueA = new Date(valueA);
      valueB = new Date(valueB);
    } else if (['budget', 'wordCount', 'cpp', 'codePrice', 'progress'].includes(sortColumn)) {
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
  const totalPages = Math.ceil(sortedOrders.length / recordsPerPage);

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

        for (const ord of importedData) {
          const budget = calculateBudget(
            Number(ord['Word Count']) || 0,
            Number(ord['CPP']) || 0,
            ord['Has Code'] === 'Yes' || ord['Has Code'] === true,
            Number(ord['Code Price']) || 0
          );
          await addDoc(collection(db, 'normalOrders'), {
            projectName: ord['Project Name'] || '',
            orderDate: ord['Order Date'] || '',
            submissionDate: ord['Due Date'] || '',
            supervisorName: ord['Writer'] || '',
            season: ord['Season'] || '',
            status: ord['Status'] || 'Pending',
            budget,
            wordCount: Number(ord['Word Count']) || 0,
            hasCode: ord['Has Code'] === 'Yes' || ord['Has Code'] === true,
            cpp: Number(ord['CPP']) || 0,
            codePrice: Number(ord['Code Price']) || 0,
            progress: Number(ord['Progress']) || 0,
          });
        }

        await fetchOrders();
        setShowImportModal(false);
        setImportFile(null);
        alert('Orders imported successfully!');
      } catch (error) {
        console.error('Error importing orders:', error);
        alert('Error importing orders');
      }
    };
    reader.readAsArrayBuffer(importFile);
  };

  const handleColumnToggle = (column) => {
    setSelectedColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setOrder(initialOrderState);
    setEditingId(null);
  };

  return (
    <Container className="py-4">
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h2 className="mb-0 fw-bold">📋 Normal Orders</h2>
        <div className="d-flex gap-3 align-items-center">
          <Button 
            variant="primary" 
            onClick={() => setShowFormModal(true)}
            className="px-4 py-2"
          >
            <i className="bi bi-plus-circle me-2"></i>Add a New Normal Order
          </Button>
          <Button 
            variant="outline-info" 
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2"
          >
            <Upload size={16} className="me-2" />Import Existing Normal Orders
          </Button>
          <Button 
            variant="outline-success" 
            onClick={exportToExcel}
            className="px-4 py-2"
          >
            <i className="bi bi-download me-2"></i>Export to Excel
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
                placeholder="Search projects..."
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
              <option value={50}>50 per page</option>
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
                Project{' '}
                {sortColumn === 'projectName' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('supervisorName')} 
                style={{ cursor: 'pointer' }}
              >
                Assigned To{' '}
                {sortColumn === 'supervisorName' && <ArrowUpDown size={14} />}
              </th>
              <th 
                className="py-3" 
                onClick={() => handleSort('submissionDate')} 
                style={{ cursor: 'pointer' }}
              >
                Due Date{' '}
                {sortColumn === 'submissionDate' && <ArrowUpDown size={14} />}
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
                onClick={() => handleSort('budget')} 
                style={{ cursor: 'pointer' }}
              >
                Budget{' '}
                {sortColumn === 'budget' && <ArrowUpDown size={14} />}
              </th>
              <th className="py-3">Progress</th>
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((ord, index) => (
              <tr key={ord.id} className={isOverdue(ord.orderDate, ord.submissionDate, ord.status) ? 'table-warning' : ''}>
                <td>{indexOfFirstRecord + index + 1}</td>
                <td>
                  <div className="fw-medium">{ord.projectName}</div>
                  <small className="text-muted">{ord.season}</small>
                </td>
                <td>{ord.supervisorName}</td>
                <td>
                  {new Date(ord.submissionDate).toLocaleDateString()}
                  {isOverdue(ord.orderDate, ord.submissionDate, ord.status) && (
                    <Badge bg="danger" className="ms-2">Overdue</Badge>
                  )}
                </td>
                <td>
                  <Badge bg={getStatusBadgeVariant(ord.status, ord.orderDate, ord.submissionDate)}>
                    {ord.status}
                  </Badge>
                </td>
                <td>Ksh.{ord.budget?.toLocaleString() ?? 0}</td>
                <td>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Progress: {ord.progress}%</Tooltip>}
                  >
                    <ProgressBar
                      now={ord.progress}
                      label={`${ord.progress}%`}
                      variant={ord.progress >= 75 ? 'success' : ord.progress >= 50 ? 'warning' : 'danger'}
                      style={{ height: '16px', cursor: 'pointer' }}
                    />
                  </OverlayTrigger>
                </td>
                <td>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => handleEdit(ord)}
                    className="me-2"
                  >
                    <i className="bi bi-pencil"></i>
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(ord.id)}
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
            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredOrders.length)} of {filteredOrders.length} projects
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
          <Modal.Title>{editingId ? 'Edit Project' : 'Add New Project'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Project Name/Code <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={order.projectName}
                    onChange={(e) => setOrder({ ...order, projectName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Season <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={order.season}
                    onChange={(e) => setOrder({ ...order, season: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Order Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={order.orderDate}
                    onChange={(e) => setOrder({ ...order, orderDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className nunc="col-md-6">
                <Form.Group>
                  <Form.Label>Due Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={order.submissionDate}
                    onChange={(e) => setOrder({ ...order, submissionDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Assigned To <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={order.supervisorName}
                    onChange={(e) => setOrder({ ...order, supervisorName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={order.status}
                    onChange={(e) => setOrder({ ...order, status: e.target.value })}
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
                    value={order.wordCount}
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
                      value={order.cpp}
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
                      value={order.codePrice}
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
                    checked={order.hasCode}
                    onChange={handleCodeToggle}
                    className="mt-4"
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Total Budget</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>Ksh.</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={order.budget}
                      readOnly
                      disabled
                    />
                  </InputGroup>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Progress (0-100%)</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      min="0"
                      max="100"
                      value={order.progress}
                      onChange={(e) => setOrder({ ...order, progress: e.target.value })}
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
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
            {editingId ? 'Update Project' : 'Add Project'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Import Projects</Modal.Title>
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
              File should have columns: Project Name, Order Date, Due Date, Writer, Season, Status, Word Count, CPP, Code Price, Has Code, Progress
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
                label={column === 'supervisorName' ? 'Assigned To' : 
                      column === 'budget' ? 'Total Budget' : 
                      column === 'isOverdue' ? 'Overdue Status' : 
                      column === 'submissionDate' ? 'Due Date' : 
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

export default NormalOrders;