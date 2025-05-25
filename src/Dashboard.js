import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, ProgressBar, Form, Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Search, Users, Briefcase, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, DollarSign, Activity, PlusCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

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
    dissertationCount: 0,
    normalOrderCount: 0,
  });

  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectTrends, setProjectTrends] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [visibleTrendLines, setVisibleTrendLines] = useState({
    total: true,
    completed: true,
    normalOrder: true,
    dissertation: true,
  });

  const [employeePage, setEmployeePage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);
  const recordsPerPage = 5;

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => updateActivityFeed(), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const employeesQuery = query(employeesRef, orderBy('hireDate', 'desc'));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesList = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const dissertationsRef = collection(db, 'dissertations');
      const dissertationsQuery = query(dissertationsRef, orderBy('submissionDate', 'desc'));
      const dissertationsSnapshot = await getDocs(dissertationsQuery);
      const dissertationsList = dissertationsSnapshot.docs.map(doc => ({ id: doc.id, type: 'Dissertation', ...doc.data() }));

      const normalOrdersRef = collection(db, 'normalOrders');
      const normalOrdersQuery = query(normalOrdersRef, orderBy('submissionDate', 'desc'));
      const normalOrdersSnapshot = await getDocs(normalOrdersQuery);
      const normalOrdersList = normalOrdersSnapshot.docs.map(doc => ({ id: doc.id, type: 'NormalOrder', ...doc.data() }));

      const projectsList = [...dissertationsList, ...normalOrdersList];

      setEmployees(employeesList);
      setProjects(projectsList);

      const activeEmps = employeesList.filter(emp => emp.status === 'Active');
      const completedProjs = projectsList.filter(proj => proj.status === 'Completed');
      const pendingProjs = projectsList.filter(proj => proj.status === 'Pending');
      const overdueProjs = projectsList.filter(proj => new Date(proj.submissionDate) < new Date() && proj.status !== 'Completed');
      const totalBudget = projectsList.reduce((sum, proj) => sum + (proj.budget || 0), 0);
      const dissertationCount = dissertationsList.length;
      const normalOrderCount = normalOrdersList.length;

      setStats({
        totalEmployees: employeesList.length,
        activeEmployees: activeEmps.length,
        totalProjects: projectsList.length,
        completedProjects: completedProjs.length,
        pendingProjects: pendingProjs.length,
        overdueProjects: overdueProjs.length,
        totalBudget,
        dissertationCount,
        normalOrderCount,
      });

      setProjectTrends(generateTrendsData(projectsList));
      setActivityFeed(generateInitialActivityFeed(projectsList, employeesList));
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
        name: `${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear()}`,
        completed: 0,
        total: 0,
        normalOrder: 0,
        dissertation: 0,
      });
    }

    projects.forEach(project => {
      const projectDate = new Date(project.submissionDate);
      const monthYear = `${projectDate.toLocaleString('default', { month: 'short' })}-${projectDate.getFullYear()}`;
      const monthIndex = months.findIndex(m => m.name === monthYear);
      
      if (monthIndex !== -1) {
        months[monthIndex].total++;
        if (project.status === 'Completed') months[monthIndex].completed++;
        if (project.type === 'NormalOrder') months[monthIndex].normalOrder++;
        else if (project.type === 'Dissertation') months[monthIndex].dissertation++;
      }
    });
    
    return months;
  };

  const generateInitialActivityFeed = (projList, empList) => {
    const recentProjects = projList.slice(0, Math.min(3, projList.length)).map(proj => ({
      text: `${proj.type} "${proj.projectName}" marked as ${proj.status}`,
      time: new Date(proj.submissionDate).toLocaleTimeString(),
      timestamp: new Date(proj.submissionDate).getTime(),
    }));

    const recentEmployees = empList.slice(0, Math.min(2, empList.length)).map(emp => ({
      text: `${emp.employeeName} added to ${emp.department}`,
      time: new Date(emp.hireDate).toLocaleTimeString(),
      timestamp: new Date(emp.hireDate).getTime(),
    }));

    const combined = [...recentProjects, ...recentEmployees]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

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
    const newActivity = {
      text: `System: Checked project status (${new Date().toLocaleTimeString()})`,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
    };

    setActivityFeed(prev => [newActivity, ...prev.slice(0, 4)]);
  };

  const exportSummary = () => {
    const summaryData = [
      {
        'Total Writers': stats.totalEmployees,
        'Active Writers': stats.activeEmployees,
        'Total Projects': stats.totalProjects,
        'Dissertations': stats.dissertationCount,
        'Normal Orders': stats.normalOrderCount,
        'Completed Projects': stats.completedProjects,
        'Pending Projects': stats.pendingProjects,
        'Overdue Projects': stats.overdueProjects,
        'Total Budget': stats.totalBudget.toLocaleString(),
        'Completion Rate': stats.totalProjects ? `${Math.round((stats.completedProjects / stats.totalProjects) * 100)}%` : '0%',
      },
      ...projects.map(project => ({
        'Project Name': project.projectName,
        'Type': project.type,
        'Supervisor': project.supervisorName,
        'Status': project.status,
        'Budget': project.budget ? `Ksh.${project.budget.toLocaleString()}` : '0',
        'Submission Date': new Date(project.submissionDate).toLocaleDateString(),
      })),
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(summaryData);
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dashboard Summary');
    XLSX.writeFile(workbook, `Dashboard_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const budgetData = [
    { name: 'Completed', value: projects.filter(p => p.status === 'Completed').reduce((sum, p) => sum + (p.budget || 0), 0) },
    { name: 'In Progress', value: projects.filter(p => p.status === 'In Progress').reduce((sum, p) => sum + (p.budget || 0), 0) },
    { name: 'Pending', value: projects.filter(p => p.status === 'Pending').reduce((sum, p) => sum + (p.budget || 0), 0) },
  ];

  const COLORS = ['#28a745', '#ffc107', '#17a2b8'];

  const filteredEmployees = employees.filter(emp =>
    emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isCurrentMonth = (date) => {
    const today = new Date();
    const projectDate = new Date(date);
    return projectDate.getFullYear() === today.getFullYear() && projectDate.getMonth() === today.getMonth();
  };

  const filteredProjects = projects
    .filter(proj =>
      (proj.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       proj.supervisorName.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'All' || proj.status === statusFilter) &&
      isCurrentMonth(proj.submissionDate)
    )
    .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  const currentEmployees = filteredEmployees.slice((employeePage - 1) * recordsPerPage, employeePage * recordsPerPage);
  const currentProjects = filteredProjects.slice((projectPage - 1) * recordsPerPage, projectPage * recordsPerPage);

  const totalEmployeePages = Math.ceil(filteredEmployees.length / recordsPerPage);
  const totalProjectPages = Math.ceil(filteredProjects.length / recordsPerPage);

  const toggleTrendLine = (key) => {
    setVisibleTrendLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Container fluid className="py-5">
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title className="d-flex justify-content-between align-items-center">
                Dashboard Overview
                <div className="d-flex align-items-center">
                  <Form.Control
                    type="text"
                    placeholder="Search dashboard..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '250px' }}
                    className="me-2"
                  />
                  <Button variant="outline-primary" onClick={exportSummary}>
                    Export Summary
                  </Button>
                </div>
              </Card.Title>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Stats Overview with Interactive Widgets */}
      <Row className="mb-4">
        <Col md={3} className="mb-4">
          <Card className="h-100 shadow-sm hover-card bg-primary text-white" onClick={() => navigate('/employees')}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary-subtle p-3 rounded-circle me-3">
                  <Users size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="mb-1">Total Writers</h6>
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
          <Card className="h-100 shadow-sm hover-card bg-success text-white" onClick={() => navigate('/projects')}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success-subtle p-3 rounded-circle me-3">
                  <Briefcase size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="mb-1">Total Projects</h6>
                  <h3 className="mb-0">{stats.totalProjects}</h3>
                  <small className="text-white">
                    Dissertations: {stats.dissertationCount} | Normal Orders: {stats.normalOrderCount}
                  </small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="h-100 shadow-sm hover-card bg-warning text-dark" onClick={() => navigate('/projects')}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning-subtle p-3 rounded-circle me-3">
                  <AlertCircle size={24} className="text-warning" />
                </div>
                <div>
                  <h6 className="mb-1">Pending Projects</h6>
                  <h3 className="mb-0">{stats.pendingProjects}</h3>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>View overdue projects</Tooltip>}
                  >
                    <Badge
                      bg="danger"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusFilter('Pending');
                        setProjectPage(1);
                      }}
                    >
                      Overdue: {stats.overdueProjects}
                    </Badge>
                  </OverlayTrigger>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-4">
          <Card className="h-100 shadow-sm bg-info text-white">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info-subtle p-3 rounded-circle me-3">
                  <CheckCircle size={24} className="text-info" />
                </div>
                <div>
                  <h6 className="mb-1">Completion Rate</h6>
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
              <Card.Title className="d-flex justify-content-between align-items-center">
                Project Trends
                <div>
                  {['total', 'completed', 'normalOrder', 'dissertation'].map(key => (
                    <Form.Check
                      key={key}
                      inline
                      type="checkbox"
                      label={key.charAt(0).toUpperCase() + key.slice(1).replace('Order', ' Order')}
                      checked={visibleTrendLines[key]}
                      onChange={() => toggleTrendLine(key)}
                    />
                  ))}
                </div>
              </Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projectTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {visibleTrendLines.total && (
                    <Line type="monotone" dataKey="total" stroke="#0d6efd" name="Total Projects" strokeWidth={2} />
                  )}
                  {visibleTrendLines.completed && (
                    <Line type="monotone" dataKey="completed" stroke="#28a745" name="Completed" strokeWidth={2} />
                  )}
                  {visibleTrendLines.normalOrder && (
                    <Line type="monotone" dataKey="normalOrder" stroke="#ffc107" name="Normal Order" strokeWidth={2} />
                  )}
                  {visibleTrendLines.dissertation && (
                    <Line type="monotone" dataKey="dissertation" stroke="#dc3545" name="Dissertation" strokeWidth={2} />
                  )}
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
                            <Activity size={18} className="text-primary me-2" />
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
              <Card.Title className="d-flex justify-content-between align-items-center">
                Recent Projects (This Month)
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: '150px' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                </Form.Select>
              </Card.Title>
              {filteredProjects.length > 0 ? (
                <Table responsive borderless>
                  <tbody>
                    {currentProjects.map(project => (
                      <tr key={project.id}>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-bold">{project.projectName} ({project.type})</span>
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
                          <small className="text-muted d-block">{new Date(project.submissionDate).toLocaleDateString()}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">No projects found for this month.</p>
              )}
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

      {/* Quick Action Button */}
      <Dropdown className="position-fixed bottom-0 end-0 m-4">
        <Dropdown.Toggle variant="primary" id="quick-actions" className="rounded-circle p-3">
          <PlusCircle size={24} />
        </Dropdown.Toggle>
        <Dropdown.Menu align="end">
          <Dropdown.Item onClick={() => navigate('/projects/normal-orders')}>New Normal Order</Dropdown.Item>
          <Dropdown.Item onClick={() => navigate('/projects/dissertations')}>New Dissertation</Dropdown.Item>
          <Dropdown.Item onClick={() => navigate('/employees')}>Add Writer</Dropdown.Item>
          <Dropdown.Item onClick={() => navigate('/invoices')}>Generate Invoice</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      <style>{`
        .hover-card:hover {
          transform: scale(1.03);
          transition: transform 0.2s ease-in-out;
          cursor: pointer;
        }
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </Container>
  );
};

export default Dashboard;