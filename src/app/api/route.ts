import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    app: 'Abroad JobsT',
    version: '1.0.0',
    status: 'operational',
    engines: ['adzuna', 'reed', 'careerjet', 'arbeitnow', 'remotive', 'jobicy'],
  });
}