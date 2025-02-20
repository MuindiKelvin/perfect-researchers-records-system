import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, InputGroup, Alert, Table, Badge, Pagination } from 'react-bootstrap';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import { Search, ArrowUpDown } from 'lucide-react';

const Invoices = () => {
  const [supervisorName, setSupervisorName] = useState('');
  const [season, setSeason] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5); // Now modifiable
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  // Fetch unique supervisors, seasons, and existing invoices on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const projectsSnapshot = await getDocs(projectsRef);
        const supervisorSet = new Set();
        const seasonSet = new Set();
        projectsSnapshot.forEach(doc => {
          const data = doc.data();
          supervisorSet.add(data.supervisorName);
          seasonSet.add(data.season);
        });
        setSupervisors([...supervisorSet]);
        setSeasons([...seasonSet]);

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

  // Fetch projects based on supervisor and season
  const fetchProjects = async () => {
    if (!supervisorName || !season) {
      setError('Please select both supervisor name and season');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const q = query(
        collection(db, 'projects'),
        where('supervisorName', '==', supervisorName),
        where('season', '==', season)
      );
      
      const querySnapshot = await getDocs(q);
      const projectList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (projectList.length === 0) {
        setError('No projects found for the selected supervisor and season');
        setProjects([]);
        return;
      }

      setProjects(projectList);
    } catch (error) {
      setError('Error fetching projects: ' + error.message);
      setProjects([]);
    }
  };

  // Generate and save invoice
  const generateInvoice = async () => {
    if (projects.length === 0) {
      setError('No projects available to generate invoice');
      return;
    }

    try {
      const totalAmount = projects.reduce((sum, project) => sum + (project.budget || 0), 0);
      const invoiceData = {
        supervisorName,
        season,
        totalAmount,
        projectCount: projects.length,
        isPaid: false,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      const newInvoice = { id: docRef.id, ...invoiceData };
      setInvoices([...invoices, newInvoice]);

      const worksheetData = projects.map(project => ({
        'Project Name': project.projectName,
        'Submission Date': new Date(project.submissionDate).toLocaleDateString(),
        'Supervisor': project.supervisorName,
        'Season': project.season,
        'Status': project.status,
        'Type': project.type,
        'Total Amount': `Ksh.${project.budget?.toLocaleString() ?? 0}`,
        'Word Count': project.wordCount?.toLocaleString() ?? 0,
        'CPP': `Ksh.${project.cpp?.toLocaleString() ?? 0}`,
        'Code Price': `Ksh.${project.codePrice?.toLocaleString() ?? 0}`,
        'Has Code': project.hasCode ? 'Yes' : 'No'
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      worksheet['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');
      XLSX.writeFile(workbook, `Invoice_${supervisorName}_${season}.xlsx`);

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
    setCurrentPage(1); // Reset to first page on sort
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
            <div className="row mb-4">
              <div className="col-md-6">
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
              </div>
              <div className="col-md-6">
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
              </div>
            </div>

            <div className="d-flex gap-3">
              <Button variant="primary" onClick={fetchProjects} disabled={!supervisorName || !season}>
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
                Found {projects.length} project{projects.length !== 1 ? 's' : ''} for {supervisorName} in {season}
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
                      setCurrentPage(1); // Reset to first page when changing records per page
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