import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Card, Table, Badge, InputGroup } from 'react-bootstrap';
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import { Search } from 'lucide-react';

const EmployeeForm = () => {
  const initialEmployeeState = {
    employeeName: '',
    hireDate: '',
    department: '',
    position: '',
    status: 'Active',
    phoneNumber: '' // Added phone number field
  };

  const [employee, setEmployee] = useState(initialEmployeeState);
  const [employees, setEmployees] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(employee =>
      employee.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phoneNumber?.includes(searchTerm) // Added phone number search
    );
    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, orderBy('hireDate', 'desc'));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        console.log("No employees found!");
      } else {
        const employeeList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmployees(employeeList);
      }
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
        employeeName: employee.employeeName.trim(),
        hireDate: employee.hireDate,
        department: employee.department.trim(),
        position: employee.position.trim(),
        status: employee.status,
        phoneNumber: employee.phoneNumber.trim() // Include phone number
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
      employeeName: employeeToEdit.employeeName,
      hireDate: employeeToEdit.hireDate,
      department: employeeToEdit.department,
      position: employeeToEdit.position,
      status: employeeToEdit.status,
      phoneNumber: employeeToEdit.phoneNumber || '' // Ensure phone number is populated
    });
    setEditingId(employeeToEdit.id);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      filteredEmployees.map(({ id, ...rest }) => ({
        ...rest,
        hireDate: new Date(rest.hireDate).toLocaleDateString()
      }))
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, 'employees.xlsx');
  };

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredEmployees.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredEmployees.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <Container className="py-5">
      <Card className="mb-5">
        <Card.Body>
          <Card.Title className="mb-4">{editingId ? 'Edit Employee' : 'Add New Employee'}</Card.Title>
          <Form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Employee Name*</Form.Label>
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
                    type="text"
                    value={employee.phoneNumber}
                    onChange={(e) => setEmployee({ ...employee, phoneNumber: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="mt-3">
              <Button type="submit" variant="primary" className="me-2">
                {editingId ? 'Update Employee' : 'Add Employee'}
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
        <h3 className="mb-0">Employee List</h3>
        <div className="d-flex gap-3 align-items-center">
          <InputGroup style={{ width: '300px' }}>
            <InputGroup.Text>
              <Search size={20} />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <Form.Select
            style={{ width: '100px' }}
            value={recordsPerPage}
            onChange={(e) => setRecordsPerPage(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </Form.Select>
        </div>
      </div>

      <Table bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Hire Date</th>
            <th>Department</th>
            <th>Position</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentRecords.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.employeeName}</td>
              <td>{employee.phoneNumber}</td>
              <td>{new Date(employee.hireDate).toLocaleDateString()}</td>
              <td>{employee.department}</td>
              <td>{employee.position}</td>
              <td>
                <Badge pill bg={employee.status === 'Active' ? 'success' : 'danger'}>
                  {employee.status}
                </Badge>
              </td>
              <td>
                <Button
                  variant="warning"
                  onClick={() => handleEdit(employee)}
                  className="me-2"
                >
                  Edit
                </Button>
                <Button variant="danger" onClick={() => handleDelete(employee.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="d-flex justify-content-between align-items-center">
        <div>
          Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredEmployees.length)} of {filteredEmployees.length} employees
        </div>
        <div>
          <Button
            variant="outline-secondary"
            disabled={currentPage === 1}
            onClick={() => paginate(currentPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline-secondary"
            disabled={currentPage === totalPages}
            onClick={() => paginate(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default EmployeeForm;
