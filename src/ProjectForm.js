import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Card, Table, Badge, InputGroup, Modal, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import * as XLSX from 'xlsx';
import { Chart } from 'react-google-charts'; // Replace react-gantt-timeline with react-google-charts
import { Search, Calendar, RefreshCw, Upload, ArrowUpDown } from 'lucide-react';

const ProjectForm = () => {
  const initialProjectState = {
    projectName: '',
    submissionDate: '',
    supervisorName: '',
    season: '',
    status: 'Pending',
    type: 'Normal',
    budget: '',
    wordCount: '',
    hasCode: false,
    cpp: '',
    codePrice: '',
    progress: 0,
  };

  const [project, setProject] = useState(initialProjectState);
  const [projects, setProjects] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showGanttModal, setShowGanttModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const filtered = projects.filter(proj => {
      const matchesSearch =
        proj.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proj.supervisorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proj.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proj.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proj.season?.toLowerCase().includes(searchTerm.toLowerCase());

      const projectDate = new Date(proj.submissionDate);
      const matchesDateRange =
        (!dateRange.start || projectDate >= new Date(dateRange.start)) &&
        (!dateRange.end || projectDate <= new Date(dateRange.end));

      return matchesSearch && matchesDateRange;
    });
    setFilteredProjects(filtered);
    setCurrentPage(1);
  }, [searchTerm, projects, dateRange]);

  const calculateBudget = (wordCount, cpp, hasCode, codePrice) => {
    const pages = wordCount / 275;
    const baseBudget = pages * cpp;
    return hasCode ? baseBudget + codePrice : baseBudget;
  };

  const handleBudgetInputChange = (e, field) => {
    const value = e.target.value === "0" ? 0 : parseFloat(e.target.value) || 0;
    setProject(prev => {
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
    setProject(prev => ({
      ...prev,
      wordCount,
      budget: calculateBudget(wordCount, prev.cpp, prev.hasCode, prev.codePrice),
    }));
  };

  const handleCodeToggle = (e) => {
    const hasCode = e.target.checked;
    setProject(prev => ({
      ...prev,
      hasCode,
      budget: calculateBudget(prev.wordCount || 0, prev.cpp, hasCode, prev.codePrice),
    }));
  };

  const fetchProjects = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, orderBy('submissionDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const projectList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
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
        !project.season || project.wordCount === "" || project.cpp === "" || project.codePrice === "") {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const calculatedBudget = calculateBudget(
        parseInt(project.wordCount),
        parseFloat(project.cpp),
        project.hasCode,
        parseFloat(project.codePrice)
      );

      const projectData = {
        ...project,
        projectName: project.projectName.trim(),
        supervisorName: project.supervisorName.trim(),
        season: project.season.trim(),
        budget: calculatedBudget,
        wordCount: parseInt(project.wordCount),
        cpp: parseFloat(project.cpp),
        codePrice: parseFloat(project.codePrice),
        progress: Number(project.progress),
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
      ...projectToEdit,
      budget: projectToEdit.budget?.toString() ?? '0',
      wordCount: projectToEdit.wordCount?.toString() ?? '0',
      cpp: projectToEdit.cpp?.toString() ?? '200',
      codePrice: projectToEdit.codePrice?.toString() ?? '500',
      progress: projectToEdit.progress || 0,
    });
    setEditingId(projectToEdit.id);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      filteredProjects.map(({ id, ...rest }) => ({
        ...rest,
        submissionDate: new Date(rest.submissionDate).toLocaleDateString(),
        budget: `Ksh.${rest.budget?.toLocaleString() ?? 0}`,
        wordCount: rest.wordCount?.toLocaleString() ?? '0',
        hasCode: rest.hasCode ? 'Yes' : 'No',
        cpp: `Ksh.${rest.cpp?.toLocaleString() ?? 0}`,
        codePrice: `Ksh.${rest.codePrice?.toLocaleString() ?? 0}`,
        progress: `${rest.progress}%`,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
    XLSX.writeFile(workbook, `projects_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isOverdue = (date) => new Date(date) < new Date();

  const getStatusBadgeVariant = (status, date) => {
    if (isOverdue(date) && status !== 'Completed') return 'danger';
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

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortColumn) return 0;
    let valueA = a[sortColumn];
    let valueB = b[sortColumn];

    if (sortColumn === 'submissionDate') {
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
  const currentRecords = sortedProjects.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedProjects.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRefreshSearch = () => {
    setDateRange({ start: '', end: '' });
    setSearchTerm('');
  };

  // Gantt Chart Data for react-google-charts
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
    ...filteredProjects.map(proj => [
      proj.id,
      proj.projectName,
      new Date(new Date(proj.submissionDate).setDate(new Date(proj.submissionDate).getDate() - 7)), // Start 7 days before submission
      new Date(proj.submissionDate),
      null, // Duration calculated automatically
      proj.progress,
      null, // No dependencies for simplicity
    ]),
  ];

  const ganttOptions = {
    height: 400,
    gantt: {
      trackHeight: 30,
      barHeight: 20,
      palette: [
        { color: '#28a745', dark: '#1e7e34' }, // Completed
        { color: '#ffc107', dark: '#e0a800' }, // In Progress
        { color: '#17a2b8', dark: '#117a8b' }, // Pending
      ],
    },
  };

  // Bulk Import
  const handleFileUpload = (e) => setImportFile(e.target.files[0]);

  const importProjects = async () => {
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

        for (const proj of importedData) {
          const budget = calculateBudget(
            Number(proj['Word Count']) || 0,
            Number(proj['CPP']) || 0,
            proj['Has Code'] === 'Yes' || proj['Has Code'] === true,
            Number(proj['Code Price']) || 0
          );
          await addDoc(collection(db, 'projects'), {
            projectName: proj['Project Name'] || '',
            submissionDate: proj['Submission Date'] || '',
            supervisorName: proj['Supervisor'] || '',
            season: proj['Season'] || '',
            status: proj['Status'] || 'Pending',
            type: proj['Type'] || 'Normal',
            budget,
            wordCount: Number(proj['Word Count']) || 0,
            hasCode: proj['Has Code'] === 'Yes' || proj['Has Code'] === true,
            cpp: Number(proj['CPP']) || 0,
            codePrice: Number(proj['Code Price']) || 0,
            progress: Number(proj['Progress']) || 0,
          });
        }

        await fetchProjects();
        setShowImportModal(false);
        setImportFile(null);
        alert('Projects imported successfully!');
      } catch (error) {
        console.error('Error importing projects:', error);
        alert('Error importing projects');
      }
    };
    reader.readAsArrayBuffer(importFile);
  };

  return (
    <Container className="py-5">
      <Card className="mb-5 shadow-sm">
        <Card.Body>
          <Card.Title className="mb-4 d-flex justify-content-between align-items-center">
            {editingId ? 'Edit Project' : 'Add New Project'}
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
                  <Form.Label>Project Name/Code*</Form.Label>
                  <Form.Control
                    type="text"
                    value={project.projectName}
                    onChange={(e) => setProject({ ...project, projectName: e.target.value })}
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
                    onChange={(e) => setProject({ ...project, submissionDate: e.target.value })}
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
                    value={project.supervisorName}
                    onChange={(e) => setProject({ ...project, supervisorName: e.target.value })}
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
                    onChange={(e) => setProject({ ...project, season: e.target.value })}
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
                    onChange={(e) => setProject({ ...project, status: e.target.value })}
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
                    onChange={(e) => setProject({ ...project, type: e.target.value })}
                  >
                    <option>Normal</option>
                    <option>Dissertation</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-3">
                  <Form.Label>Word Count*</Form.Label>
                  <Form.Control
                    type="number"
                    value={project.wordCount}
                    onChange={handleWordCountChange}
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
                  <Form.Label>Cost Per Page (CPP)*</Form.Label>
                  <Form.Control
                    type="number"
                    value={project.cpp}
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
                    value={project.codePrice}
                    onChange={(e) => handleBudgetInputChange(e, 'codePrice')}
                    required
                    min="0"
                    step="1"
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Includes Code"
                    checked={project.hasCode}
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
                    value={project.budget}
                    readOnly
                    disabled
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-12">
                <Form.Group className="mb-3">
                  <Form.Label>Progress (0-100%)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    value={project.progress}
                    onChange={(e) => setProject({ ...project, progress: e.target.value })}
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
            <InputGroup.Text><Search size={20} /></InputGroup.Text>
            <Form.Control
              placeholder="Search projects..."
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
              <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                Type{' '}
                {sortColumn === 'type' && <ArrowUpDown size={16} className="ms-1" />}
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
              <th onClick={() => handleSort('budget')} style={{ cursor: 'pointer' }}>
                Total Amount{' '}
                {sortColumn === 'budget' && <ArrowUpDown size={16} className="ms-1" />}
              </th>
              <th onClick={() => handleSort('wordCount')} style={{ cursor: 'pointer' }}>
                Word Count{' '}
                {sortColumn === 'wordCount' && <ArrowUpDown size={16} className="ms-1" />}
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
            {currentRecords.map((proj, index) => (
              <tr key={proj.id}>
                <td>{indexOfFirstRecord + index + 1}</td>
                <td>{proj.projectName}</td>
                <td>{proj.type}</td>
                <td>{proj.supervisorName}</td>
                <td>
                  <Badge bg={getStatusBadgeVariant(proj.status, proj.submissionDate)}>
                    {proj.status}
                    {isOverdue(proj.submissionDate) && proj.status !== 'Completed' && ' (Overdue)'}
                  </Badge>
                </td>
                <td>{proj.season}</td>
                <td>Ksh.{proj.budget?.toLocaleString() ?? 0}</td>
                <td>{proj.wordCount?.toLocaleString() ?? 0}</td>
                <td>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Progress: {proj.progress}%</Tooltip>}
                  >
                    <ProgressBar
                      now={proj.progress}
                      label={`${proj.progress}%`}
                      variant={proj.progress >= 75 ? 'success' : proj.progress >= 50 ? 'warning' : 'danger'}
                      style={{ height: '20px', cursor: 'pointer' }}
                    />
                  </OverlayTrigger>
                </td>
                <td>{new Date(proj.submissionDate).toLocaleDateString()}</td>
                <td>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleEdit(proj)}
                    className="me-2"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(proj.id)}
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
            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredProjects.length)} of {filteredProjects.length} projects
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

      {/* Gantt Chart Modal */}
      <Modal show={showGanttModal} onHide={() => setShowGanttModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Project Timeline (Gantt Chart)</Modal.Title>
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
          <Modal.Title>Bulk Import Projects</Modal.Title>
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
              File should have columns: Project Name, Submission Date, Writer, Season, Status, Type, Word Count, CPP, Code Price, Has Code, Progress
            </small>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={importProjects}>
            Import
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProjectForm;