import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge } from 'react-bootstrap';
import { Bar, Pie } from 'react-chartjs-2';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports = () => {
  const [projectData, setProjectData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  const [projectStats, setProjectStats] = useState({
    normal: 0,
    dissertation: 0,
    statusCounts: { 'Pending': 0, 'In Progress': 0, 'Completed': 0 },
    totalBudget: 0,
    budgetByType: { Normal: 0, Dissertation: 0 },
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchProjectsByFilters();
  }, [selectedYear, selectedSupervisor]);

  const fetchInitialData = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      const years = new Set();
      const supervisors = new Set();
      snapshot.forEach(doc => {
        const project = doc.data();
        years.add(project.season);
        supervisors.add(project.supervisorName);
      });
      setAvailableYears(Array.from(years).sort().reverse());
      setAvailableSupervisors(Array.from(supervisors).sort());
      if (!selectedYear && years.size > 0) setSelectedYear(Array.from(years)[0]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      alert('Error fetching initial data');
    }
  };

  const fetchProjectsByFilters = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      let q = query(projectsRef, where('season', '==', selectedYear));
      if (selectedSupervisor) {
        q = query(q, where('supervisorName', '==', selectedSupervisor));
      }
      const snapshot = await getDocs(q);
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjectData(projects);

      let normal = 0, dissertation = 0, totalBudget = 0;
      const statusCounts = { 'Pending': 0, 'In Progress': 0, 'Completed': 0 };
      const budgetByType = { Normal: 0, Dissertation: 0 };

      projects.forEach(project => {
        if (project.type === 'Normal') {
          normal++;
          budgetByType.Normal += project.budget || 0;
        } else if (project.type === 'Dissertation') {
          dissertation++;
          budgetByType.Dissertation += project.budget || 0;
        }
        if (project.status in statusCounts) statusCounts[project.status]++;
        totalBudget += project.budget || 0;
      });

      setProjectStats({ normal, dissertation, statusCounts, totalBudget, budgetByType });
    } catch (error) {
      console.error('Error fetching project data:', error);
      alert('Error fetching project data');
    }
  };

  const projectTypeChartData = {
    labels: ['Normal Projects', 'Dissertation Projects'],
    datasets: [{
      label: 'Project Distribution',
      data: [projectStats.normal, projectStats.dissertation],
      backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
      borderWidth: 1,
    }],
  };

  const projectStatusChartData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [{
      label: 'Project Status Distribution',
      data: [
        projectStats.statusCounts['Pending'],
        projectStats.statusCounts['In Progress'],
        projectStats.statusCounts['Completed'],
      ],
      backgroundColor: ['rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)'],
      borderWidth: 1,
    }],
  };

  const budgetDistributionChartData = {
    labels: ['Normal', 'Dissertation'],
    datasets: [{
      label: 'Budget Distribution (Ksh)',
      data: [projectStats.budgetByType.Normal, projectStats.budgetByType.Dissertation],
      backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)'],
      hoverOffset: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.parsed;
            return `${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`;
          },
        },
      },
    },
  };

  const pieChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw;
            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: Ksh.${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const totalProjects = projectStats.normal + projectStats.dissertation;
  const completionRate = totalProjects > 0
    ? ((projectStats.statusCounts['Completed'] / totalProjects) * 100).toFixed(1)
    : 0;

  const downloadPDFReport = () => {
    const doc = new jsPDF();
    doc.text('Project Analytics Report', 20, 20);
    doc.text(`Season: ${selectedYear}`, 20, 30);
    if (selectedSupervisor) doc.text(`Supervisor: ${selectedSupervisor}`, 20, 40);

    doc.autoTable({
      startY: selectedSupervisor ? 50 : 40,
      head: [['Metric', 'Value']],
      body: [
        ['Total Projects', totalProjects],
        ['Normal Projects', projectStats.normal],
        ['Dissertation Projects', projectStats.dissertation],
        ['Pending', projectStats.statusCounts['Pending']],
        ['In Progress', projectStats.statusCounts['In Progress']],
        ['Completed', projectStats.statusCounts['Completed']],
        ['Completion Rate', `${completionRate}%`],
        ['Total Budget', `Ksh.${projectStats.totalBudget.toLocaleString()}`],
        ['Normal Budget', `Ksh.${projectStats.budgetByType.Normal.toLocaleString()}`],
        ['Dissertation Budget', `Ksh.${projectStats.budgetByType.Dissertation.toLocaleString()}`],
      ],
    });

    doc.save(`Project_Report_${selectedYear}${selectedSupervisor ? `_${selectedSupervisor}` : ''}.pdf`);
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title className="mb-4 d-flex justify-content-between align-items-center">
                Project Analytics Dashboard
                <Button variant="outline-primary" size="sm" onClick={downloadPDFReport}>
                  <i className="bi bi-download me-2"></i>Download PDF
                </Button>
              </Card.Title>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Select Season</Form.Label>
                    <Form.Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="mb-3"
                    >
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Select Writer</Form.Label>
                    <Form.Select
                      value={selectedSupervisor}
                      onChange={(e) => setSelectedSupervisor(e.target.value)}
                      className="mb-3"
                    >
                      <option value="">All Writers</option>
                      {availableSupervisors.map(supervisor => (
                        <option key={supervisor} value={supervisor}>{supervisor}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Project Type Distribution</Card.Title>
              <div style={{ height: '300px' }}>
                <Bar data={projectTypeChartData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Project Status Distribution</Card.Title>
              <div style={{ height: '300px' }}>
                <Bar data={projectStatusChartData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Budget Distribution</Card.Title>
              <div style={{ height: '300px' }}>
                <Pie data={budgetDistributionChartData} options={pieChartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Summary Statistics</Card.Title>
              <Row className="mt-3 text-center">
                <Col md={3}>
                  <h5>Total Projects</h5>
                  <p className="h2">{totalProjects}</p>
                </Col>
                <Col md={3}>
                  <h5>Completion Rate</h5>
                  <p className="h2">{completionRate}%</p>
                  <Badge bg={completionRate >= 75 ? 'success' : 'warning'}>
                    {completionRate >= 75 ? 'High' : 'Moderate'}
                  </Badge>
                </Col>
                <Col md={3}>
                  <h5>Total Budget</h5>
                  <p className="h2">Ksh.{projectStats.totalBudget.toLocaleString()}</p>
                </Col>
                <Col md={3}>
                  <h5>In Progress</h5>
                  <p className="h2">{projectStats.statusCounts['In Progress']}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Reports;