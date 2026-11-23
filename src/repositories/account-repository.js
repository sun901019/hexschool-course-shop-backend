function createAccountRepository(source) {
  return {
    findUserByEmail(email) {
      return source.getRepository('User').findOneBy({ email });
    },
    findUser(id) {
      return source.getRepository('User').findOneBy({ id });
    },
    createMember(payload) {
      return source.transaction(async manager => {
        const user = await manager.getRepository('User').save({ ...payload, role: 'Member' });
        await manager.getRepository('Cart').insert({ userId: user.id });
        return user;
      });
    },
    async createSession(session) {
      return source.getRepository('Session').insert(session);
    },
    findSession(id, userId) {
      return source.getRepository('Session').findOneBy({ id, userId });
    },
    revokeSession(id, userId) {
      return source.getRepository('Session').delete({ id, userId });
    },
  };
}

module.exports = { createAccountRepository };
