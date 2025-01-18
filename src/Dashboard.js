import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button } from 'react-bootstrap';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Search, Users, Briefcase, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Login from './Login';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalProjects: 0,
    completedProjects: 0,
    pendingProjects: 0,
    overdueProjects: 0
  });

  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectTrends, setProjectTrends] = useState([]);
  
  // Pagination states
  const [employeeStartIndex, setEmployeeStartIndex] = useState(0);
  const [projectStartIndex, setProjectStartIndex] = useState(0);
  const recordsPerPage = 5;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch employees
      const employeesRef = collection(db, 'employees');
      const employeesQuery = query(employeesRef, orderBy('hireDate', 'desc'));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesList = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch projects
      const projectsRef = collection(db, 'projects');
      const projectsQuery = query(projectsRef, orderBy('submissionDate', 'desc'));
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsList = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setEmployees(employeesList);
      setProjects(projectsList);

      // Calculate stats
      const activeEmps = employeesList.filter(emp => emp.status === 'Active');
      const completedProjs = projectsList.filter(proj => proj.status === 'Completed');
      const pendingProjs = projectsList.filter(proj => proj.status === 'Pending');
      const overdueProjs = projectsList.filter(proj => 
        new Date(proj.submissionDate) < new Date() && proj.status !== 'Completed'
      );

      setStats({
        totalEmployees: employeesList.length,
        activeEmployees: activeEmps.length,
        totalProjects: projectsList.length,
        completedProjects: completedProjs.length,
        pendingProjects: pendingProjs.length,
        overdueProjects: overdueProjs.length
      });

      // Generate project trends data
      const trendsData = generateTrendsData(projectsList);
      setProjectTrends(trendsData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const generateTrendsData = (projects) => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        name: date.toLocaleString('default', { month: 'short' }),
        completed: 0,
        total: 0
      });
    }

    projects.forEach(project => {
      const projectDate = new Date(project.submissionDate);
      const monthIndex = months.findIndex(m => 
        m.name === projectDate.toLocaleString('default', { month: 'short' })
      );
      if (monthIndex !== -1) {
        months[monthIndex].total++;
        if (project.status === 'Completed') {
          months[monthIndex].completed++;
        }
      }
    });

    return months;
  };

  // Pagination handlers
  const handleNextEmployees = () => {
    if (employeeStartIndex + recordsPerPage < employees.length) {
      setEmployeeStartIndex(employeeStartIndex + recordsPerPage);
    }
  };

  const handlePrevEmployees = () => {
    if (employeeStartIndex - recordsPerPage >= 0) {
      setEmployeeStartIndex(employeeStartIndex - recordsPerPage);
    }
  };

  const handleNextProjects = () => {
    if (projectStartIndex + recordsPerPage < projects.length) {
      setProjectStartIndex(projectStartIndex + recordsPerPage);
    }
  };

  const handlePrevProjects = () => {
    if (projectStartIndex - recordsPerPage >= 0) {
      setProjectStartIndex(projectStartIndex - recordsPerPage);
    }
  };

  // Get current page records
  const currentEmployees = employees.slice(employeeStartIndex, employeeStartIndex + recordsPerPage);
  const currentProjects = projects.slice(projectStartIndex, projectStartIndex + recordsPerPage);

  return (
    <Container className="py-5">
      {/* Stats Overview */}
      <Row className="mb-4">
        <Col md={3} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                  <Users className="text-primary" size={24} />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Employees</h6>
                  <h3 className="mb-0">{stats.totalEmployees}</h3>
                  <small className="text-muted">Active: {stats.activeEmployees}</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded-circle me-3">
                  <Briefcase className="text-success" size={24} />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Projects</h6>
                  <h3 className="mb-0">{stats.totalProjects}</h3>
                  <small className="text-muted">Completed: {stats.completedProjects}</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded-circle me-3">
                  <AlertCircle className="text-warning" size={24} />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Pending Projects</h6>
                  <h3 className="mb-0">{stats.pendingProjects}</h3>
                  <small className="text-muted">Overdue: {stats.overdueProjects}</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 p-3 rounded-circle me-3">
                  <CheckCircle className="text-info" size={24} />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Completion Rate</h6>
                  <h3 className="mb-0">
                    {stats.totalProjects ? 
                      Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%
                  </h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Project Trends Chart */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Project Trends</Card.Title>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#0d6efd" name="Total Projects" />
                <Line type="monotone" dataKey="completed" stroke="#198754" name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>

      {/* Recent Activity */}
      <Row>
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title>Recent Employees</Card.Title>
                <div>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={handlePrevEmployees}
                    disabled={employeeStartIndex === 0}
                    className="me-2"
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={handleNextEmployees}
                    disabled={employeeStartIndex + recordsPerPage >= employees.length}
                  >
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
              <Table responsive borderless>
                <tbody>
                  {currentEmployees.map(employee => (
                    <tr key={employee.id}>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-bold">{employee.employeeName}</span>
                          <small className="text-muted">{employee.position}</small>
                        </div>
                      </td>
                      <td className="text-end">
                        <small className="text-muted">
                          {new Date(employee.hireDate).toLocaleDateString()}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="text-muted text-end">
                Showing {employeeStartIndex + 1}-{Math.min(employeeStartIndex + recordsPerPage, employees.length)} of {employees.length}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title>Recent Projects</Card.Title>
                <div>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={handlePrevProjects}
                    disabled={projectStartIndex === 0}
                    className="me-2"
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={handleNextProjects}
                    disabled={projectStartIndex + recordsPerPage >= projects.length}
                  >
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
              <Table responsive borderless>
                <tbody>
                  {currentProjects.map(project => (
                    <tr key={project.id}>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-bold">{project.projectName}</span>
                          <small className="text-muted">{project.supervisorName}</small>
                        </div>
                      </td>
                      <td className="text-end">
                        <span className={`badge ${
                          project.status === 'Completed' ? 'bg-success' : 
                          project.status === 'In Progress' ? 'bg-warning' : 
                          'bg-primary'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="text-muted text-end">
                Showing {projectStartIndex + 1}-{Math.min(projectStartIndex + recordsPerPage, projects.length)} of {projects.length}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;