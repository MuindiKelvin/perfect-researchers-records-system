import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Card, Table, Badge, InputGroup } from 'react-bootstrap';
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import { Search } from 'lucide-react';

const ProjectForm = () => {
  const initialProjectState = {
    projectName: '',
    submissionDate: '',
    supervisorName: '',
    season: '',
    status: 'Pending',
    type: 'Normal',
    budget: ''
  };

  const [project, setProject] = useState(initialProjectState);
  const [projects, setProjects] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [filteredProjects, setFilteredProjects] = useState([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const filtered = projects.filter(project => 
      project.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.supervisorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.season?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
    setCurrentPage(1);
  }, [searchTerm, projects]);

  const fetchProjects = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, orderBy('submissionDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const projectList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectList);
    } catch (error) {
      console.error('Error fetching projects:', error);
      alert('Error fetching projects');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!project.projectName || !project.submissionDate || !project.supervisorName || 
        !project.season || !project.budget) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const projectData = {
        projectName: project.projectName.trim(),
        submissionDate: project.submissionDate,
        supervisorName: project.supervisorName.trim(),
        season: project.season.trim(),
        status: project.status,
        type: project.type,
        budget: parseFloat(project.budget)
      };

      if (editingId) {
        const projectRef = doc(db, 'projects', editingId);
        await updateDoc(projectRef, projectData);
      } else {
        await addDoc(collection(db, 'projects'), projectData);
      }

      setProject(initialProjectState);
      setEditingId(null);
      await fetchProjects();
      alert(`Project ${editingId ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Error saving project:', error);
      alert(`Error ${editingId ? 'updating' : 'adding'} project: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteDoc(doc(db, 'projects', id));
        await fetchProjects();
        alert('Project deleted successfully!');
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project');
      }
    }
  };

  const handleEdit = (projectToEdit) => {
    setProject({
      projectName: projectToEdit.projectName,
      submissionDate: projectToEdit.submissionDate,
      supervisorName: projectToEdit.supervisorName,
      season: projectToEdit.season,
      status: projectToEdit.status,
      type: projectToEdit.type,
      budget: projectToEdit.budget.toString()
    });
    setEditingId(projectToEdit.id);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      filteredProjects.map(({ id, ...rest }) => ({
        ...rest,
        submissionDate: new Date(rest.submissionDate).toLocaleDateString(),
        budget: `$${rest.budget.toLocaleString()}`
      }))
    );
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
    XLSX.writeFile(workbook, 'projects.xlsx');
  };

  const isOverdue = (date) => {
    return new Date(date) < new Date();
  };

  const getStatusBadgeVariant = (status, date) => {
    if (isOverdue(date) && status !== 'Completed') return 'danger';
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'warning';
      case 'Pending': return 'info';
      default: return 'secondary';
    }
  };

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredProjects.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredProjects.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <Container className="py-5">
      <Card className="mb-5">
        <Card.Body>
          <Card.Title className="mb-4">{editingId ? 'Edit Project' : 'Add New Project'}</Card.Title>
          <Form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Project Name*</Form.Label>
                  <Form.Control
                    type="text"
                    value={project.projectName}
                    onChange={(e) => setProject({...project, projectName: e.target.value})}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Submission Date*</Form.Label>
                  <Form.Control
                    type="date"
                    value={project.submissionDate}
                    onChange={(e) => setProject({...project, submissionDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Supervisor Name*</Form.Label>
                  <Form.Control
                    type="text"
                    value={project.supervisorName}
                    onChange={(e) => setProject({...project, supervisorName: e.target.value})}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Season*</Form.Label>
                  <Form.Control
                    type="text"
                    value={project.season}
                    onChange={(e) => setProject({...project, season: e.target.value})}
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
                    value={project.status}
                    onChange={(e) => setProject({...project, status: e.target.value})}
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Project Type</Form.Label>
                  <Form.Select
                    value={project.type}
                    onChange={(e) => setProject({...project, type: e.target.value})}
                  >
                    <option>Normal</option>
                    <option>Dissertation</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Budget*</Form.Label>
                  <Form.Control
                    type="number"
                    value={project.budget}
                    onChange={(e) => setProject({...project, budget: e.target.value})}
                    required
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>
            </div>

            <div className="mt-3">
              <Button type="submit" variant="primary" className="me-2">
                {editingId ? 'Update Project' : 'Add Project'}
              </Button>
              {editingId && (
                <Button 
                  variant="secondary"
                  onClick={() => {
                    setProject(initialProjectState);
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
        <h3 className="mb-0">Project List</h3>
        <div className="d-flex gap-3 align-items-center">
          <InputGroup style={{ width: '300px' }}>
            <InputGroup.Text>
              <Search size={20} />
            </InputGroup.Text>
            <Form.Control
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <Form.Select 
            style={{ width: '100px' }}
            value={recordsPerPage}
            onChange={(e) => setRecordsPerPage(Number(e.target.value))}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
          </Form.Select>
          <Button variant="success" onClick={exportToExcel}>
            Export to Excel
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Type</th>
              <th>Supervisor</th>
              <th>Status</th>
              <th>Season</th>
              <th>Budget</th>
              <th>Submission Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((project) => (
              <tr key={project.id}>
                <td>{project.projectName}</td>
                <td>{project.type}</td>
                <td>{project.supervisorName}</td>
                <td>
                  <Badge bg={getStatusBadgeVariant(project.status, project.submissionDate)}>
                    {project.status}
                    {isOverdue(project.submissionDate) && project.status !== 'Completed' && 
                      ' (Overdue)'}
                  </Badge>
                </td>
                <td>{project.season}</td>
                <td>Ksh.{project.budget.toLocaleString()}</td>
                <td>
                  {new Date(project.submissionDate).toLocaleDateString()}
                </td>
                <td>
                  <Button 
                    variant="warning" 
                    size="sm" 
                    onClick={() => handleEdit(project)}
                    className="me-2"
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => handleDelete(project.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {filteredProjects.length > recordsPerPage && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredProjects.length)} of {filteredProjects.length} entries
          </div>
          <nav>
            <ul className="pagination mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => paginate(currentPage - 1)}>
                  Previous
                </button>
              </li>
              {[...Array(totalPages)].map((_, i) => (
                <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => paginate(i + 1)}>
                    {i + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => paginate(currentPage + 1)}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </Container>
  );
};

export default ProjectForm;