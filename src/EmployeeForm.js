import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Card, Table, Badge, InputGroup, Modal, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import { Search, Upload, ArrowUpDown } from 'lucide-react';

const EmployeeForm = () => {
  const initialEmployeeState = {
    employeeName: '',
    hireDate: '',
    department: '',
    position: '',
    status: 'Active',
    phoneNumber: '',
    performanceScore: 0, // New field for performance tracking
  };

  const [employee, setEmployee] = useState(initialEmployeeState);
  const [employees, setEmployees] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(emp =>
      emp.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phoneNumber?.includes(searchTerm)
    );
    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, orderBy('hireDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const employeeList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmployees(employeeList);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Error fetching employees');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employee.employeeName || !employee.hireDate || !employee.department || !employee.position || !employee.phoneNumber) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const employeeData = {
        ...employee,
        employeeName: employee.employeeName.trim(),
        department: employee.department.trim(),
        position: employee.position.trim(),
        phoneNumber: employee.phoneNumber.trim(),
        performanceScore: Number(employee.performanceScore),
      };

      if (editingId) {
        const employeeRef = doc(db, 'employees', editingId);
        await updateDoc(employeeRef, employeeData);
      } else {
        await addDoc(collection(db, 'employees'), employeeData);
      }

      setEmployee(initialEmployeeState);
      setEditingId(null);
      await fetchEmployees();
      alert(`Employee ${editingId ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Error saving employee:', error);
      alert(`Error ${editingId ? 'updating' : 'adding'} employee: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteDoc(doc(db, 'employees', id));
        await fetchEmployees();
        alert('Employee deleted successfully!');
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error deleting employee');
      }
    }
  };

  const handleEdit = (employeeToEdit) => {
    setEmployee({
      ...employeeToEdit,
      performanceScore: employeeToEdit.performanceScore || 0,
    });
    setEditingId(employeeToEdit.id);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      filteredEmployees.map(({ id, ...rest }) => ({
        ...rest,
        hireDate: new Date(rest.hireDate).toLocaleDateString(),
      }))
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, 'employees.xlsx');
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

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortColumn) return 0;
    let valueA = a[sortColumn];
    let valueB = b[sortColumn];

    if (sortColumn === 'hireDate') {
      valueA = new Date(valueA);
      valueB = new Date(valueB);
    } else if (sortColumn === 'performanceScore') {
      valueA = Number(valueA);
      valueB = Number(valueB);
    }

    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = sortedEmployees.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedEmployees.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Bulk Import
  const handleFileUpload = (e) => {
    setImportFile(e.target.files[0]);
  };

  const importEmployees = async () => {
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

        for (const emp of importedData) {
          await addDoc(collection(db, 'employees'), {
            employeeName: emp['Name'] || '',
            hireDate: emp['Hire Date'] || '',
            department: emp['Department'] || '',
            position: emp['Position'] || '',
            status: emp['Status'] || 'Active',
            phoneNumber: emp['Phone'] || '',
            performanceScore: Number(emp['Performance Score']) || 0,
          });
        }

        await fetchEmployees();
        setShowImportModal(false);
        setImportFile(null);
        alert('Employees imported successfully!');
      } catch (error) {
        console.error('Error importing employees:', error);
        alert('Error importing employees');
      }
    };
    reader.readAsArrayBuffer(importFile);
  };

  return (
    <Container className="py-5">
      <Card className="mb-5 shadow-sm">
        <Card.Body>
          <Card.Title className="mb-4 d-flex justify-content-between align-items-center">
            {editingId ? 'Edit Writer' : 'Add New Writer'}
            <Button variant="outline-info" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload size={16} className="me-2" />Bulk Import
            </Button>
          </Card.Title>
          <Form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Writer Name*</Form.Label>
                  <Form.Control
                    type="text"
                    value={employee.employeeName}
                    onChange={(e) => setEmployee({ ...employee, employeeName: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Hire Date*</Form.Label>
                  <Form.Control
                    type="date"
                    value={employee.hireDate}
                    onChange={(e) => setEmployee({ ...employee, hireDate: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Department*</Form.Label>
                  <Form.Control
                    type="text"
                    value={employee.department}
                    onChange={(e) => setEmployee({ ...employee, department: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Position*</Form.Label>
                  <Form.Control
                    type="text"
                    value={employee.position}
                    onChange={(e) => setEmployee({ ...employee, position: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={employee.status}
                    onChange={(e) => setEmployee({ ...employee, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number*</Form.Label>
                  <Form.Control
                    type="tel"
                    value={employee.phoneNumber}
                    onChange={(e) => setEmployee({ ...employee, phoneNumber: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Performance Score (0-100)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    value={employee.performanceScore}
                    onChange={(e) => setEmployee({ ...employee, performanceScore: e.target.value })}
                  />
                </Form.Group>
              </div>
            </div>

            <div className="mt-3">
              <Button type="submit" variant="primary" className="me-2">
                {editingId ? 'Update Writer' : 'Add Writer'}
              </Button>
              {editingId && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEmployee(initialEmployeeState);
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
        <h3 className="mb-0">Writers List</h3>
        <div className="d-flex gap-3 align-items-center">
          <InputGroup style={{ width: '300px' }}>
            <InputGroup.Text><Search size={20} /></InputGroup.Text>
            <Form.Control
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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

      <Table bordered hover responsive className="shadow-sm">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th onClick={() => handleSort('employeeName')} style={{ cursor: 'pointer' }}>
              Name{' '}
              {sortColumn === 'employeeName' && <ArrowUpDown size={16} className="ms-1" />}
            </th>
            <th onClick={() => handleSort('phoneNumber')} style={{ cursor: 'pointer' }}>
              Phone{' '}
              {sortColumn === 'phoneNumber' && <ArrowUpDown size={16} className="ms-1" />}
            </th>
            <th onClick={() => handleSort('hireDate')} style={{ cursor: 'pointer' }}>
              Hire Date{' '}
              {sortColumn === 'hireDate' && <ArrowUpDown size={16} className="ms-1" />}
            </th>
            <th onClick={() => handleSort('department')} style={{ cursor: 'pointer' }}>
              Department{' '}
              {sortColumn === 'department' && <ArrowUpDown size={16} className="ms-1" />}
            </th>
            <th onClick={() => handleSort('position')} style={{ cursor: 'pointer' }}>
              Position{' '}
              {sortColumn === 'position' && <ArrowUpDown size={16} className="ms-1" />}
            </th>
            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
              Status{' '}
              {sortColumn === 'status' && <ArrowUpDown size={16} className="ms-1" />}
            </th>
            <th onClick={() => handleSort('performanceScore')} style={{ cursor: 'pointer' }}>
              Performance{' '}
              {sortColumn === 'performanceScore' && <ArrowUpDown size={16} className="ms-1" />}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentRecords.map((emp, index) => (
            <tr key={emp.id}>
              <td>{indexOfFirstRecord + index + 1}</td>
              <td>{emp.employeeName}</td>
              <td>{emp.phoneNumber}</td>
              <td>{new Date(emp.hireDate).toLocaleDateString()}</td>
              <td>{emp.department}</td>
              <td>{emp.position}</td>
              <td>
                <Badge pill bg={emp.status === 'Active' ? 'success' : 'danger'}>
                  {emp.status}
                </Badge>
              </td>
              <td>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip>Score: {emp.performanceScore}%</Tooltip>}
                >
                  <ProgressBar
                    now={emp.performanceScore}
                    label={`${emp.performanceScore}%`}
                    variant={emp.performanceScore >= 75 ? 'success' : emp.performanceScore >= 50 ? 'warning' : 'danger'}
                    style={{ height: '20px', cursor: 'pointer' }}
                  />
                </OverlayTrigger>
              </td>
              <td>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => handleEdit(emp)}
                  className="me-2"
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(emp.id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>
          Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredEmployees.length)} of {filteredEmployees.length} employees
        </div>
        <div>
          <Button
            variant="outline-primary"
            disabled={currentPage === 1}
            onClick={() => paginate(currentPage - 1)}
            className="me-2"
          >
            Previous
          </Button>
          <span className="mx-2">Page {currentPage} of {totalPages}</span>
          <Button
            variant="outline-primary"
            disabled={currentPage === totalPages}
            onClick={() => paginate(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Bulk Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Bulk Import Employees</Modal.Title>
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
              File should have columns: Name, Hire Date, Department, Position, Status, Phone, Performance Score
            </small>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={importEmployees}>
            Import
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmployeeForm;