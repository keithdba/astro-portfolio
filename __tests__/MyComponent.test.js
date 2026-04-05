import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

test('renders MyComponent correctly', () => {
    render(<MyComponent />);
    const linkElement = screen.getByText(/some text/i);
    expect(linkElement).toBeInTheDocument();
});