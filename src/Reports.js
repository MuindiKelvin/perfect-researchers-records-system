import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const [projectData, setProjectData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState([]);
  const [projectStats, setProjectStats] = useState({
    normal: 0,
    dissertation: 0,
    statusCounts: {
      'Pending': 0,
      'In Progress': 0,
      'Completed': 0
    }
  });

  useEffect(() => {
    fetchAvailableYears();
    fetchProjectsByYear();
  }, [selectedYear]);

  const fetchAvailableYears = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const snapshot = await getDocs(projectsRef);
      const years = new Set();
      snapshot.forEach(doc => {
        const project = doc.data();
        years.add(project.season);
      });
      setAvailableYears(Array.from(years).sort().reverse());
      if (!selectedYear && years.size > 0) {
        setSelectedYear(Array.from(years)[0]);
      }
    } catch (error) {
      console.error("Error fetching years:", error);
      alert("Error fetching available years");
    }
  };

  const fetchProjectsByYear = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, where("season", "==", selectedYear));
      const snapshot = await getDocs(q);
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjectData(projects);

      // Update stats based on fetched projects
      let normal = 0, dissertation = 0;
      const statusCounts = {
        'Pending': 0,
        'In Progress': 0,
        'Completed': 0
      };

      projects.forEach(project => {
        if (project.type === 'Normal') normal++;
        else if (project.type === 'Dissertation') dissertation++;

        if (project.status in statusCounts) {
          statusCounts[project.status]++;
        }
      });

      setProjectStats({
        normal,
        dissertation,
        statusCounts
      });
    } catch (error) {
      console.error("Error fetching project data:", error);
      alert("Error fetching project data");
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
        projectStats.statusCounts['Completed']
      ],
      backgroundColor: [
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)'
      ],
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  const totalProjects = projectStats.normal + projectStats.dissertation;
  const completionRate = totalProjects > 0
    ? ((projectStats.statusCounts['Completed'] / totalProjects) * 100).toFixed(1)
    : 0;

  return (
    <Container fluid className="p-4">
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title className="mb-4">Project Analytics Dashboard</Card.Title>
              <Form.Group>
                <Form.Label>Select Season (Per Year)</Form.Label>
                <Form.Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="mb-4"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Project Type Distribution</Card.Title>
              <div style={{ height: '400px' }}>
                <Bar data={projectTypeChartData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Project Status Distribution</Card.Title>
              <div style={{ height: '400px' }}>
                <Bar data={projectStatusChartData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Summary Statistics</Card.Title>
              <Row className="mt-3">
                <Col md={4}>
                  <h5>Total Projects</h5>
                  <p className="h2">{totalProjects}</p>
                </Col>
                <Col md={4}>
                  <h5>Completion Rate</h5>
                  <p className="h2">{completionRate}%</p>
                </Col>
                <Col md={4}>
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
