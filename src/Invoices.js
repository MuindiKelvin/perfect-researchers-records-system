import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, InputGroup, Alert, Table, Badge, Pagination, Row, Col } from 'react-bootstrap';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import { Search, ArrowUpDown } from 'lucide-react';

const Invoices = () => {
  const [supervisorName, setSupervisorName] = useState('');
  const [season, setSeason] = useState('');
  const [projectType, setProjectType] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  // State for column selection
  const [selectedColumns, setSelectedColumns] = useState({
    'Project Name': true,
    'Submission Date': true,
    'Supervisor': true,
    'Season': true,
    'Status': true,
    'Type': true,
    'Total Amount': true,
    'Word Count': true,
    'CPP': true,
    'Code Price': true,
    'Has Code': true
  });

  // Fetch unique supervisors, seasons, and existing invoices on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const dissertationsRef = collection(db, 'dissertations');
        const dissertationsSnapshot = await getDocs(dissertationsRef);
        const dissertationSupervisors = new Set();
        const dissertationSeasons = new Set();
        dissertationsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.supervisorName) dissertationSupervisors.add(data.supervisorName);
          if (data.season) dissertationSeasons.add(data.season);
        });

        const normalOrdersRef = collection(db, 'normalOrders');
        const normalOrdersSnapshot = await getDocs(normalOrdersRef);
        normalOrdersSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.supervisorName) dissertationSupervisors.add(data.supervisorName);
          if (data.season) dissertationSeasons.add(data.season);
        });

        setSupervisors([...dissertationSupervisors]);
        setSeasons([...dissertationSeasons]);

        const invoicesRef = collection(db, 'invoices');
        const invoicesSnapshot = await getDocs(invoicesRef);
        const invoiceList = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInvoices(invoiceList);
      } catch (error) {
        setError('Error fetching initial data: ' + error.message);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch projects based on supervisor, season, and project type
  const fetchProjects = async () => {
    if (!supervisorName || !season || !projectType) {
      setError('Please select writer name, season, and project type');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const collectionName = projectType === 'Dissertations' ? 'dissertations' : 'normalOrders';
      const q = query(
        collection(db, collectionName),
        where('supervisorName', '==', supervisorName),
        where('season', '==', season)
      );
      
      const querySnapshot = await getDocs(q);
      const projectList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: projectType
      }));

      if (projectList.length === 0) {
        setError(`No ${projectType.toLowerCase()} found for the selected writer and season`);
        setProjects([]);
        return;
      }

      setProjects(projectList);
    } catch (error) {
      setError(`Error fetching ${projectType.toLowerCase()}: ` + error.message);
      setProjects([]);
    }
  };

  // Handle column selection
  const handleColumnChange = (column) => {
    setSelectedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Generate and save invoice
  const generateInvoice = async () => {
    if (projects.length === 0) {
      setError('No projects available to generate invoice');
      return;
    }

    // Check if at least one column is selected
    const hasSelectedColumns = Object.values(selectedColumns).some(value => value);
    if (!hasSelectedColumns) {
      setError('Please select at least one column to include in the invoice');
      return;
    }

    try {
      const totalAmount = projects.reduce((sum, project) => sum + (project.budget || 0), 0);
      const invoiceData = {
        supervisorName,
        season,
        projectType,
        totalAmount,
        projectCount: projects.length,
        isPaid: false,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      const newInvoice = { id: docRef.id, ...invoiceData };
      setInvoices([...invoices, newInvoice]);

      // Prepare worksheet data with selected columns
      const worksheetData = projects.map(project => {
        const row = {};
        if (selectedColumns['Project Name']) row['Project Name'] = project.projectName;
        if (selectedColumns['Submission Date']) row['Submission Date'] = new Date(project.submissionDate).toLocaleDateString();
        if (selectedColumns['Supervisor']) row['Supervisor'] = project.supervisorName;
        if (selectedColumns['Season']) row['Season'] = project.season;
        if (selectedColumns['Status']) row['Status'] = project.status;
        if (selectedColumns['Type']) row['Type'] = project.type;
        if (selectedColumns['Total Amount']) row['Total Amount'] = project.budget ?? 0;
        if (selectedColumns['Word Count']) row['Word Count'] = project.wordCount ?? 0;
        if (selectedColumns['CPP']) row['CPP'] = project.cpp ?? 0;
        if (selectedColumns['Code Price']) row['Code Price'] = project.codePrice ?? 0;
        if (selectedColumns['Has Code']) row['Has Code'] = project.hasCode ? 'Yes' : 'No';
        return row;
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Add Total Amount calculation if Total Amount column is selected
      if (selectedColumns['Total Amount']) {
        const totalRow = worksheetData.length + 2;
        const totalAmountColumnIndex = Object.keys(worksheetData[0]).indexOf('Total Amount');
        if (totalAmountColumnIndex !== -1) {
          const columnLetter = String.fromCharCode(65 + totalAmountColumnIndex); // e.g., 'G' for Total Amount
          XLSX.utils.sheet_add_aoa(worksheet, [
            [{ f: `SUM(${columnLetter}2:${columnLetter}${totalRow - 1})` }]
          ], { origin: `${columnLetter}${totalRow}` });
          worksheet[`${columnLetter}${totalRow}`].z = '"Ksh."#,##0.00';
          worksheet[`${columnLetter}${totalRow}`].s = {
            font: { bold: true },
            alignment: { horizontal: 'right' }
          };
        }
      }

      // Set column widths based on selected columns
      const columnWidths = [];
      Object.keys(selectedColumns).forEach(column => {
        if (selectedColumns[column]) {
          columnWidths.push({ wch: column === 'Project Name' || column === 'Supervisor' ? 20 : column === 'Submission Date' || column === 'Season' || column === 'Status' || column === 'Type' || column === 'Total Amount' ? 15 : 12 });
        }
      });
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');
      XLSX.writeFile(workbook, `Invoice_${supervisorName}_${season}_${projectType}.xlsx`);

      setSuccess('Invoice generated, saved, and downloaded successfully!');
      setProjects([]);
    } catch (error) {
      setError('Error generating invoice: ' + error.message);
    }
  };

  // Update payment status
  const updatePaymentStatus = async (invoiceId, currentStatus) => {
    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, { isPaid: !currentStatus });
      setInvoices(invoices.map(invoice =>
        invoice.id === invoiceId ? { ...invoice, isPaid: !currentStatus } : invoice
      ));
      setSuccess(`Invoice marked as ${!currentStatus ? 'Paid' : 'Unpaid'} successfully!`);
    } catch (error) {
      setError('Error updating payment status: ' + error.message);
    }
  };

  // Delete invoice
  const deleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteDoc(doc(db, 'invoices', invoiceId));
        setInvoices(invoices.filter(invoice => invoice.id !== invoiceId));
        setSuccess('Invoice deleted successfully!');
      } catch (error) {
        setError('Error deleting invoice: ' + error.message);
      }
    }
  };

  // Sorting function
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (!sortColumn) return 0;

    let valueA = a[sortColumn];
    let valueB = b[sortColumn];

    if (sortColumn === 'createdAt') {
      valueA = new Date(valueA);
      valueB = new Date(valueB);
    } else if (sortColumn === 'isPaid') {
      valueA = valueA ? 1 : 0;
      valueB = valueB ? 1 : 0;
    }

    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = sortedInvoices.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedInvoices.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <Container className="py-5">
      <Card className="mb-4">
        <Card.Header>
          <h3 className="mb-0">Generate Invoice</h3>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

          <Form>
            <Row className="mb-4">
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Writer Name</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><Search size={20} /></InputGroup.Text>
                    <Form.Select
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      required
                    >
                      <option value="">Select Writer</option>
                      {supervisors.map((supervisor, index) => (
                        <option key={index} value={supervisor}>{supervisor}</option>
                      ))}
                    </Form.Select>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Season</Form.Label>
                  <Form.Select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    required
                  >
                    <option value="">Select Season</option>
                    {seasons.map((season, index) => (
                      <option key={index} value={season}>{season}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Project Type</Form.Label>
                  <Form.Select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    required
                  >
                    <option value="">Select Project Type</option>
                    <option value="Dissertations">Dissertations</option>
                    <option value="NormalOrders">Normal Orders</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label>Select Columns to Include in Invoice</Form.Label>
              <Row>
                {Object.keys(selectedColumns).map(column => (
                  <Col xs={6} md={4} lg={3} key={column} className="mb-2">
                    <Form.Check
                      type="checkbox"
                      label={column}
                      checked={selectedColumns[column]}
                      onChange={() => handleColumnChange(column)}
                    />
                  </Col>
                ))}
              </Row>
            </Form.Group>

            <div className="d-flex gap-3">
              <Button variant="primary" onClick={fetchProjects} disabled={!supervisorName || !season || !projectType}>
                Search Projects
              </Button>
              <Button variant="success" onClick={generateInvoice} disabled={projects.length === 0}>
                Generate Invoice
              </Button>
            </div>
          </Form>

          {projects.length > 0 && (
            <div className="mt-4">
              <p className="text-muted">
                Found {projects.length} {projectType.toLowerCase()}{projects.length !== 1 ? 's' : ''} for {supervisorName} in {season}
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Invoices Table */}
      <Card>
        <Card.Header>
          <h4 className="mb-0">Generated Invoices</h4>
        </Card.Header>
        <Card.Body>
          {invoices.length === 0 ? (
            <p className="text-muted">No invoices generated yet.</p>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Form.Group className="d-flex align-items-center">
                  <Form.Label className="me-2 mb-0">Records per page:</Form.Label>
                  <Form.Select
                    value={recordsPerPage}
                    onChange={(e) => {
                      setRecordsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{ width: '100px' }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th onClick={() => handleSort('supervisorName')} style={{ cursor: 'pointer' }}>
                        Supervisor{' '}
                        {sortColumn === 'supervisorName' && (
                          <ArrowUpDown size={16} className="ms-1" />
                        )}
                      </th>
                      <th onClick={() => handleSort('season')} style={{ cursor: 'pointer' }}>
                        Season{' '}
                        {sortColumn === 'season' && (
                          <ArrowUpDown size={16} className="ms-1" />
                        )}
                      </th>
                      <th onClick={() => handleSort('projectType')} style={{ cursor: 'pointer' }}>
                        Project Type{' '}
                        {sortColumn === 'projectType' && (
                          <ArrowUpDown size={16} className="ms-1" />
                        )}
                      </th>
                      <th onClick={() => handleSort('totalAmount')} style={{ cursor: 'pointer' }}>
                        Total Amount{' '}
                        {sortColumn === 'totalAmount' && (
                          <ArrowUpDown size={16} className="ms-1" />
                        )}
                      </th>
                      <th onClick={() => handleSort('projectCount')} style={{ cursor: 'pointer' }}>
                        Projects{' '}
                        {sortColumn === 'projectCount' && (
                          <ArrowUpDown size={16} className="ms-1" />
                        )}
                      </th>
                      <th onClick={() => handleSort('isPaid')} style={{ cursor: 'pointer' }}>
                        Status{' '}
                        {sortColumn === 'isPaid' && (
                          <ArrowUpDown size={16} className="ms-1" />
                        )}
                      </th>
                      <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>
                        Created Date{' '}
                        {sortColumn === 'createdAt' && (
                          <ArrowUpDown size={16} className="ms-1" />
                        )}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((invoice, index) => (
                      <tr key={invoice.id}>
                        <td>{indexOfFirstRecord + index + 1}</td>
                        <td>{invoice.supervisorName}</td>
                        <td>{invoice.season}</td>
                        <td>{invoice.projectType}</td>
                        <td>Ksh.{invoice.totalAmount.toLocaleString()}</td>
                        <td>{invoice.projectCount}</td>
                        <td>
                          <Badge bg={invoice.isPaid ? 'success' : 'warning'}>
                            {invoice.isPaid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                        <td>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                        <td>
                          <Button
                            variant={invoice.isPaid ? 'warning' : 'success'}
                            size="sm"
                            onClick={() => updatePaymentStatus(invoice.id, invoice.isPaid)}
                            className="me-2"
                          >
                            Mark as {invoice.isPaid ? 'Unpaid' : 'Paid'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteInvoice(invoice.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {invoices.length > recordsPerPage && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, invoices.length)} of {invoices.length} invoices
                  </div>
                  <Pagination>
                    <Pagination.Prev
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                    {[...Array(totalPages)].map((_, i) => (
                      <Pagination.Item
                        key={i + 1}
                        active={i + 1 === currentPage}
                        onClick={() => paginate(i + 1)}
                      >
                        {i + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Invoices;