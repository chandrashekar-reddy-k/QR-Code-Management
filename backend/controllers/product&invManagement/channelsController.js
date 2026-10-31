export async function getChannels(req, res) {
  try {
    const channels = [
      { code: 'ONLINE', name: 'Online' },
      { code: 'VEHICLE', name: 'VSMS' },
      { code: 'POS', name: 'POS' }
    ];
    return res.status(200).json({ status: 200, data: channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}
// #jbjbjbv