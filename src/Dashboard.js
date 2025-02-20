import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, ProgressBar, Form } from 'react-bootstrap';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Search, Users, Briefcase, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, DollarSign, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalProjects: 0,
    completedProjects: 0,
    pendingProjects: 0,
    overdueProjects: 0,
    totalBudget: 0,
  });

  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectTrends, setProjectTrends] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [employeePage, setEmployeePage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);
  const recordsPerPage = 5;

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => updateActivityFeed(), 5000); // Changed to updateActivityFeed
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const employeesQuery = query(employeesRef, orderBy('hireDate', 'desc'));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesList = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const projectsRef = collection(db, 'projects');
      const projectsQuery = query(projectsRef, orderBy('submissionDate', 'desc'));
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsList = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setEmployees(employeesList);
      setProjects(projectsList);

      const activeEmps = employeesList.filter(emp => emp.status === 'Active');
      const completedProjs = projectsList.filter(proj => proj.status === 'Completed');
      const pendingProjs = projectsList.filter(proj => proj.status === 'Pending');
      const overdueProjs = projectsList.filter(proj => new Date(proj.submissionDate) < new Date() && proj.status !== 'Completed');
      const totalBudget = projectsList.reduce((sum, proj) => sum + (proj.budget || 0), 0);

      setStats({
        totalEmployees: employeesList.length,
        activeEmployees: activeEmps.length,
        totalProjects: projectsList.length,
        completedProjects: completedProjs.length,
        pendingProjects: pendingProjs.length,
        overdueProjects: overdueProjs.length,
        totalBudget,
      });

      setProjectTrends(generateTrendsData(projectsList));
      setActivityFeed(generateInitialActivityFeed(projectsList, employeesList)); // Set initial feed
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
        total: 0,
        normalType: 0,
        dissertationType: 0,
      });
    }

    projects.forEach(project => {
      const projectDate = new Date(project.submissionDate);
      const monthIndex = months.findIndex(m => m.name === projectDate.toLocaleString('default', { month: 'short' }));
      if (monthIndex !== -1) {
        months[monthIndex].total++;
        if (project.status === 'Completed') months[monthIndex].completed++;
        if (project.type === 'Normal') months[monthIndex].normalType++;
        else if (project.type === 'Dissertation') months[monthIndex].dissertationType++;
      }
    });
    return months;
  };

  const generateInitialActivityFeed = (projList, empList) => {
    const recentProjects = projList.slice(0, Math.min(3, projList.length)).map(proj => ({
      text: `Project "${proj.projectName}" marked as ${proj.status}`,
      time: new Date(proj.submissionDate).toLocaleTimeString(),
      timestamp: new Date(proj.submissionDate).getTime(),
    }));

    const recentEmployees = empList.slice(0, Math.min(2, empList.length)).map(emp => ({
      text: `${emp.employeeName} added to ${emp.department}`,
      time: new Date(emp.hireDate).toLocaleTimeString(),
      timestamp: new Date(emp.hireDate).getTime(),
    }));

    const combined = [...recentProjects, ...recentEmployees]
      .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp descending
      .slice(0, 5);

    // Ensure at least 5 entries with fallback
    while (combined.length < 5) {
      combined.push({
        text: 'System: Dashboard initialized',
        time: new Date().toLocaleTimeString(),
        timestamp: Date.now(),
      });
    }

    return combined;
  };

  const updateActivityFeed = () => {
    // Simulate new activity by occasionally adding a new entry
    const newActivity = {
      text: `System: Checked project status (${new Date().toLocaleTimeString()})`,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
    };

    setActivityFeed(prev => {
      const updated = [newActivity, ...prev.slice(0, 4)]; // Keep latest 5, add new at top
      return updated;
    });
  };

  const budgetData = [
    { name: 'Completed', value: projects.filter(p => p.status === 'Completed').reduce((sum, p) => sum + p.budget, 0) },
    { name: 'In Progress', value: projects.filter(p => p.status === 'In Progress').reduce((sum, p) => sum + p.budget, 0) },
    { name: 'Pending', value: projects.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.budget, 0) },
  ];

  const COLORS = ['#28a745', '#ffc107', '#17a2b8'];

  const filteredEmployees = employees.filter(emp =>
    emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredProjects = projects.filter(proj =>
    proj.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proj.supervisorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentEmployees = filteredEmployees.slice((employeePage - 1) * recordsPerPage, employeePage * recordsPerPage);
  const currentProjects = filteredProjects.slice((projectPage - 1) * recordsPerPage, projectPage * recordsPerPage);

  const totalEmployeePages = Math.ceil(filteredEmployees.length / recordsPerPage);
  const totalProjectPages = Math.ceil(filteredProjects.length / recordsPerPage);

  return (
    <Container fluid className="py-5">
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title className="d-flex justify-content-between align-items-center">
                Dashboard Overview
                <Form.Control
                  type="text"
                  placeholder="Search dashboard..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '250px' }}
                  className="ms-auto"
                />
              </Card.Title>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stats Overview with Interactive Widgets */}
      <Row className="mb-4">
        <Col md={3} className="mb-4">
          <Card className="h-100 shadow-sm hover-card" onClick={() => navigate('/employees')}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                  <i className="bi bi-people-fill text-primary" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Writers</h6>
                  <h3 className="mb-0">{stats.totalEmployees}</h3>
                  <ProgressBar
                    now={(stats.activeEmployees / stats.totalEmployees) * 100 || 0}
                    variant="success"
                    label={`${stats.activeEmployees} Active`}
                    className="mt-2"
                    style={{ height: '10px' }}
                  />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="h-100 shadow-sm hover-card" onClick={() => navigate('/projects')}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded-circle me-3">
                  <i className="bi bi-folder-fill text-success" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Projects</h6>
                  <h3 className="mb-0">{stats.totalProjects}</h3>
                  <ProgressBar
                    now={(stats.completedProjects / stats.totalProjects) * 100 || 0}
                    variant="info"
                    label={`${stats.completedProjects} Done`}
                    className="mt-2"
                    style={{ height: '10px' }}
                  />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="h-100 shadow-sm hover-card" onClick={() => navigate('/projects')}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded-circle me-3">
                  <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Pending Projects</h6>
                  <h3 className="mb-0">{stats.pendingProjects}</h3>
                  <small className="text-danger">Overdue: {stats.overdueProjects}</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 p-3 rounded-circle me-3">
                  <i className="bi bi-check-circle-fill text-info" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Completion Rate</h6>
                  <h3 className="mb-0">
                    {stats.totalProjects ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%
                  </h3>
                  <Badge bg={stats.completedProjects / stats.totalProjects >= 0.75 ? 'success' : 'warning'}>
                    {stats.completedProjects / stats.totalProjects >= 0.75 ? 'High' : 'Moderate'}
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Project Trends and Budget Overview */}
      <Row className="mb-4">
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Project Trends</Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projectTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#0d6efd" name="Total Projects" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#28a745" name="Completed" strokeWidth={2} />
                  <Line type="monotone" dataKey="normalType" stroke="#ffc107" name="Normal" strokeWidth={2} />
                  <Line type="monotone" dataKey="dissertationType" stroke="#dc3545" name="Dissertation" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Budget Overview</Card.Title>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={budgetData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {budgetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Ksh.${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mt-2">
                <h6>Total: Ksh.{stats.totalBudget.toLocaleString()}</h6>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity and Tables */}
      <Row>
        <Col lg={4} className="mb-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Activity Feed</Card.Title>
              {activityFeed.length > 0 ? (
                <Table responsive borderless>
                  <tbody>
                    {activityFeed.map((activity, index) => (
                      <tr key={index}>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className="bi bi-activity text-primary me-2" style={{ fontSize: '1.2rem' }}></i>
                            <div>
                              <span>{activity.text}</span>
                              <small className="text-muted d-block">{activity.time}</small>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">No recent activity available.</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mb-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Recent Writers</Card.Title>
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
                        <small className="text-muted">{new Date(employee.hireDate).toLocaleDateString()}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="d-flex justify-content-between align-items-center mt-3">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setEmployeePage(employeePage - 1)}
                  disabled={employeePage === 1}
                >
                  <ChevronLeft size={18} />
                </Button>
                <span>Page {employeePage} of {totalEmployeePages}</span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setEmployeePage(employeePage + 1)}
                  disabled={employeePage === totalEmployeePages}
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mb-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Recent Projects</Card.Title>
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
                        <Badge
                          bg={
                            project.status === 'Completed' ? 'success' :
                            project.status === 'In Progress' ? 'warning' :
                            'primary'
                          }
                        >
                          {project.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="d-flex justify-content-between align-items-center mt-3">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setProjectPage(projectPage - 1)}
                  disabled={projectPage === 1}
                >
                  <ChevronLeft size={18} />
                </Button>
                <span>Page {projectPage} of {totalProjectPages}</span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setProjectPage(projectPage + 1)}
                  disabled={projectPage === totalProjectPages}
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style>{`
        .hover-card:hover {
          transform: scale(1.03);
          transition: transform 0.2s ease-in-out;
          cursor: pointer;
        }
      `}</style>
    </Container>
  );
};

export default Dashboard;