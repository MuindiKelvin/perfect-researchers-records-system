import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
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
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

const Reports = () => {
  const [projectData, setProjectData] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  const [projectStats, setProjectStats] = useState({
    normalOrder: 0,
    dissertation: 0,
    statusCounts: { Pending: 0, InProgress: 0, Completed: 0 },
    totalBudget: 0,
    budgetByType: { NormalOrder: 0, Dissertation: 0 },
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchProjectsByFilters();
  }, [selectedSeason, selectedSupervisor]);

  const fetchInitialData = async () => {
    try {
      const dissertationsRef = collection(db, 'dissertations');
      const dissertationsSnapshot = await getDocs(dissertationsRef);
      const dissertationsList = dissertationsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'Dissertation',
        ...doc.data(),
      }));

      const normalOrdersRef = collection(db, 'normalOrders');
      const normalOrdersSnapshot = await getDocs(normalOrdersRef);
      const normalOrdersList = normalOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'NormalOrder',
        ...doc.data(),
      }));

      const projects = [...dissertationsList, ...normalOrdersList];
      const seasons = new Set();
      const supervisors = new Set();

      projects.forEach(project => {
        if (project.season) seasons.add(project.season);
        if (project.supervisorName) supervisors.add(project.supervisorName);
      });

      const sortedSeasons = Array.from(seasons).sort();
      setAvailableSeasons(sortedSeasons);
      setAvailableSupervisors(Array.from(supervisors).sort());

      if (!selectedSeason && seasons.size > 0) {
        setSelectedSeason(sortedSeasons[0]);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      alert('Error fetching initial data');
    }
  };

  const fetchProjectsByFilters = async () => {
    try {
      let projects = [];

      let dissertationsQuery = collection(db, 'dissertations');
      if (selectedSeason) {
        dissertationsQuery = query(dissertationsQuery, where('season', '==', selectedSeason));
      }
      if (selectedSupervisor) {
        dissertationsQuery = query(dissertationsQuery, where('supervisorName', '==', selectedSupervisor));
      }
      const dissertationsSnapshot = await getDocs(dissertationsQuery);
      const dissertationsList = dissertationsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'Dissertation',
        ...doc.data(),
      }));

      let normalOrdersQuery = collection(db, 'normalOrders');
      if (selectedSeason) {
        normalOrdersQuery = query(normalOrdersQuery, where('season', '==', selectedSeason));
      }
      if (selectedSupervisor) {
        normalOrdersQuery = query(normalOrdersQuery, where('supervisorName', '==', selectedSupervisor));
      }
      const normalOrdersSnapshot = await getDocs(normalOrdersQuery);
      const normalOrdersList = normalOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'NormalOrder',
        ...doc.data(),
      }));

      projects = [...dissertationsList, ...normalOrdersList];
      setProjectData(projects);

      let normalOrder = 0, dissertation = 0, totalBudget = 0;
      const statusCounts = { Pending: 0, InProgress: 0, Completed: 0 };
      const budgetByType = { NormalOrder: 0, Dissertation: 0 };

      projects.forEach(project => {
        if (project.type === 'NormalOrder') {
          normalOrder++;
          budgetByType.NormalOrder += project.budget || 0;
        } else if (project.type === 'Dissertation') {
          dissertation++;
          budgetByType.Dissertation += project.budget || 0;
        }
        const statusKey = project.status === 'In Progress' ? 'InProgress' : project.status;
        if (statusKey in statusCounts) statusCounts[statusKey]++;
        totalBudget += project.budget || 0;
      });

      setProjectStats({ normalOrder, dissertation, statusCounts, totalBudget, budgetByType });
    } catch (error) {
      console.error('Error fetching project data:', error);
      alert('Error fetching project data');
    }
  };

  const totalProjects = projectStats.normalOrder + projectStats.dissertation;

  const projectTypeChartData = {
    labels: ['Normal Orders', 'Dissertations'],
    datasets: [{
      label: 'Project Distribution',
      data: [projectStats.normalOrder, projectStats.dissertation],
      backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
    }],
  };

  const projectStatusChartData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [{
      label: 'Project Status Distribution',
      data: [
        projectStats.statusCounts.Pending,
        projectStats.statusCounts.InProgress,
        projectStats.statusCounts.Completed,
      ],
      backgroundColor: ['rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)'],
    }],
  };

  const budgetDistributionChartData = {
    labels: ['Normal Orders', 'Dissertations'],
    datasets: [{
      label: 'Budget Distribution (Ksh)',
      data: [projectStats.budgetByType.NormalOrder, projectStats.budgetByType.Dissertation],
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
            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
      datalabels: {
        color: '#fff',
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
          return `${percentage}%`;
        },
        font: {
          weight: 'bold',
          size: 12,
        },
        anchor: 'center',
        align: 'center',
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
            const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
            return `${label}: Ksh.${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
      datalabels: {
        color: 'black',
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
          return `${percentage}%`;
        },
        font: {
          weight: 'bold',
          size: 12,
        },
        anchor: 'center',
        align: 'center',
      },
    },
  };

  const completionRate = totalProjects > 0
    ? ((projectStats.statusCounts.Completed / totalProjects) * 100).toFixed(0)
    : 0;

  const downloadPDFReport = () => {
    const doc = new jsPDF();
    doc.text('Project Analytics Report', 20, 20);
    doc.text(`Season: ${selectedSeason}`, 20, 30);
    if (selectedSupervisor) doc.text(`Supervisor: ${selectedSupervisor}`, 20, 40);

    doc.autoTable({
      startY: selectedSupervisor ? 50 : 40,
      head: [['Metric', 'Value']],
      body: [
        ['Total Projects', totalProjects],
        ['Normal Orders', projectStats.normalOrder],
        ['Dissertations', projectStats.dissertation],
        ['Pending', projectStats.statusCounts.Pending],
        ['In Progress', projectStats.statusCounts.InProgress],
        ['Completed', projectStats.statusCounts.Completed],
        ['Completion Rate', `${completionRate}%`],
        ['Total Budget', `Ksh.${projectStats.totalBudget.toLocaleString()}`],
        ['Normal Orders Budget', `Ksh.${projectStats.budgetByType.NormalOrder.toLocaleString()}`],
        ['Dissertations Budget', `Ksh.${projectStats.budgetByType.Dissertation.toLocaleString()}`],
      ],
    });

    const filename = `Project_Report_${selectedSeason.replace(/\s+/g, '_')}${selectedSupervisor ? `_${selectedSupervisor.replace(/\s+/g, '_')}` : ''}.pdf`;
    doc.save(filename);
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title className="mb-4 d-flex justify-content-between align-items-center">
                Project Analytics Dashboard - Season {selectedSeason || 'N/A'}
                <Button variant="outline-primary" size="sm" onClick={downloadPDFReport}>
                  <i className="bi bi-download me-2"></i>Download PDF
                </Button>
              </Card.Title>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Select Season</Form.Label>
                    <Form.Select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(e.target.value)}
                      className="mb-3"
                    >
                      {availableSeasons.map(season => (
                        <option key={season} value={season}>{season}</option>
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
              <Card.Title>Project Status</Card.Title>
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

      <Row className="mt-4">
      <Col md={3}>
        <Card bg="primary" text="white" className="shadow-sm">
          <Card.Body>
            <Card.Title>Total Projects</Card.Title>
            <h3>{totalProjects}</h3>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card bg="success" text="white" className="shadow-sm">
          <Card.Body>
            <Card.Title>Completed Projects</Card.Title>
            <h3>{projectStats.statusCounts.Completed}</h3>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card bg="info" text="white" className="shadow-sm">
          <Card.Body>
            <Card.Title>Total Budget</Card.Title>
            <h5>Ksh. {projectStats.totalBudget.toLocaleString()}</h5>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card bg="warning" text="dark" className="shadow-sm">
          <Card.Body>
            <Card.Title>Completion Rate</Card.Title>
            <h4>{completionRate}%</h4>
          </Card.Body>
        </Card>
      </Col>
    </Row>

    </Container>
  );
};

export default Reports;
