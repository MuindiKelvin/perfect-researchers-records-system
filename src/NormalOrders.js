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
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

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
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      filteredOrders.map(({ id, ...rest }) => ({
        ...rest,
        orderDate: new Date(rest.orderDate).toLocaleDateString(),
        submissionDate: new Date(rest.submissionDate).toLocaleDateString(),
        budget: `Ksh.${rest.budget?.toLocaleString() ?? 0}`,
        wordCount: rest.wordCount?.toLocaleString() ?? '0',
        hasCode: rest.hasCode ? 'Yes' : 'No',
        cpp: `Ksh.${rest.cpp?.toLocaleString() ?? 0}`,
        codePrice: `Ksh.${rest.codePrice?.toLocaleString() ?? 0}`,
        progress: `${rest.progress}%`,
        isOverdue: isOverdue(rest.orderDate, rest.submissionDate, rest.status) ? 'Yes' : 'No',
      }))
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Normal Orders');
    XLSX.writeFile(workbook, `normal_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRefreshSearch = () => {
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
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
            submissionDate: ord['Submission Date'] || '',
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

  return (
    <Container className="py-5">
      <Card className="mb-5 shadow-sm">
        <Card.Body>
          <Card.Title className="mb-4 d-flex justify-content-between align-items-center">
            {editingId ? 'Edit Normal Order' : 'Add New Normal Order'}
            <Button variant="outline-info" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload size={16} className="me-2" />Bulk Import
            </Button>
          </Card.Title>
          <Form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Project Name/Code*</Form.Label>
                  <Form.Control
                    type="text"
                    value={order.projectName}
                    onChange={(e) => setOrder({ ...order, projectName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Order Date*</Form.Label>
                  <Form.Control
                    type="date"
                    value={order.orderDate}
                    onChange={(e) => setOrder({ ...order, orderDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Submission Date*</Form.Label>
                  <Form.Control
                    type="date"
                    value={order.submissionDate}
                    onChange={(e) => setOrder({ ...order, submissionDate: e.target.value })}
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
                    value={order.supervisorName}
                    onChange={(e) => setOrder({ ...order, supervisorName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Season*</Form.Label>
                  <Form.Control
                    type="text"
                    value={order.season}
                    onChange={(e) => setOrder({ ...order, season: e.target.value })}
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
                    value={order.status}
                    onChange={(e) => setOrder({ ...order, status: e.target.value })}
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
                    value={order.wordCount}
                    onChange={handleWordCountChange}
                    required
                    min="0"
                    step="1"
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Cost Per Page (CPP)*</Form.Label>
                  <Form.Control
                    type="number"
                    value={order.cpp}
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
                    value={order.codePrice}
                    onChange={(e) => handleBudgetInputChange(e, 'codePrice')}
                    required
                    min="0"
                    step="1"
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Includes Code"
                    checked={order.hasCode}
                    onChange={handleCodeToggle}
                    className="mt-4"
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Label>Calculated Amount</Form.Label>
                  <Form.Control
                    type="number"
                    value={order.budget}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Progress (0-100%)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    value={order.progress}
                    onChange={(e) => setOrder({ ...order, progress: e.target.value })}
                  />
                </Form.Group>
              </div>
            </div>

            <div className="mt-3">
              <Button type="submit" variant="primary" className="me-2">
                {editingId ? 'Update Order' : 'Add Order'}
              </Button>
              {editingId && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOrder(initialOrderState);
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
        <h3 className="mb-0">Normal Orders List</h3>
        <div className="d-flex gap-3 align-items-center">
          <InputGroup style={{ width: '300px' }}>
            <InputGroup.Text><Search size={20} /></InputGroup.Text>
            <Form.Control
              placeholder="Search orders..."
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
                Project Name{' '}
                {sortColumn === 'projectName' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('supervisorName')} style={{ cursor: 'pointer' }}>
                Writer{' '}
                {sortColumn === 'supervisorName' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('orderDate')} style={{ cursor: 'pointer' }}>
                Order Date{' '}
                {sortColumn === 'orderDate' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('submissionDate')} style={{ cursor: 'pointer' }}>
                Submission Date{' '}
                {sortColumn === 'submissionDate' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                Status{' '}
                {sortColumn === 'status' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('season')} style={{ cursor: 'pointer' }}>
                Season{' '}
                {sortColumn === 'season' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('budget')} style={{ cursor: 'pointer' }}>
                Total Amount{' '}
                {sortColumn === 'budget' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('wordCount')} style={{ cursor: 'pointer' }}>
                Word Count{' '}
                {sortColumn === 'wordCount' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th>Has Code</th>
              <th onClick={() => handleSort('progress')} style={{ cursor: 'pointer' }}>
                Progress{' '}
                {sortColumn === 'progress' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((ord, index) => (
              <tr key={ord.id}>
                <td>{indexOfFirstRecord + index + 1}</td>
                <td>{ord.projectName}</td>
                <td>{ord.supervisorName}</td>
                <td>{new Date(ord.orderDate).toLocaleDateString()}</td>
                <td>{new Date(ord.submissionDate).toLocaleDateString()}</td>
                <td>
                  <Badge bg={getStatusBadgeVariant(ord.status, ord.orderDate, ord.submissionDate)}>
                    {ord.status}
                    {isOverdue(ord.orderDate, ord.submissionDate, ord.status) && ' (Overdue)'}
                  </Badge>
                </td>
                <td>{ord.season}</td>
                <td>Ksh.{ord.budget?.toLocaleString() ?? 0}</td>
                <td>{ord.wordCount?.toLocaleString() ?? 0}</td>
                <td>
                  <Badge bg={ord.hasCode ? 'success' : 'secondary'}>
                    {ord.hasCode ? 'Yes' : 'No'}
                  </Badge>
                </td>
                <td>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Progress: {ord.progress}%</Tooltip>}
                  >
                    <ProgressBar
                      now={ord.progress}
                      label={`${ord.progress}%`}
                      variant={ord.progress >= 75 ? 'success' : ord.progress >= 50 ? 'warning' : 'danger'}
                      style={{ height: '20px', cursor: 'pointer' }}
                    />
                  </OverlayTrigger>
                </td>
                <td>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleEdit(ord)}
                    className="me-2"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(ord.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {filteredOrders.length > recordsPerPage && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredOrders.length)} of {filteredOrders.length} orders
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

      {/* Bulk Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Bulk Import Normal Orders</Modal.Title>
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
              File should have columns: Project Name, Order Date, Submission Date, Writer, Season, Status, Word Count, CPP, Code Price, Has Code, Progress
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
    </Container>
  );
};

export default NormalOrders;