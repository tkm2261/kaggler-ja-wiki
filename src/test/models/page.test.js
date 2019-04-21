const chai = require('chai');
const sinonChai = require('sinon-chai');
const utils = require('../utils.js');

const { expect } = chai;
const testDBUtil = global.testDBUtil;

chai.use(sinonChai);

describe('Page', () => {
  const Page = utils.models.Page;
  const User = utils.models.User;
  const conn = utils.mongoose.connection;

  let createdPages;
  let createdUsers;

  before(async() => {
    await conn.collection('pages').remove();

    const userFixture = [
      { name: 'Anon 0', username: 'anonymous0', email: 'anonymous0@example.com' },
      { name: 'Anon 1', username: 'anonymous1', email: 'anonymous1@example.com' },
      { name: 'Anon 2', username: 'anonymous2', email: 'anonymous2@example.com' },
    ];

    createdUsers = await testDBUtil.generateFixture(conn, 'User', userFixture);

    const testUser0 = createdUsers[0];
    const testUser1 = createdUsers[1];

    const UserGroup = conn.model('UserGroup');
    let testGroup0 = new UserGroup();
    testGroup0.name = 'TestGroup0';
    let testGroup1 = new UserGroup();
    testGroup1.name = 'TestGroup1';
    testGroup0 = await testGroup0.save();
    testGroup1 = await testGroup1.save();

    const userGroupRelationFixture = [
      {
        relatedGroup: testGroup0,
        relatedUser: testUser0,
      },
      {
        relatedGroup: testGroup0,
        relatedUser: testUser1,
      },
    ];
    await testDBUtil.generateFixture(conn, 'UserGroupRelation', userGroupRelationFixture);

    const fixture = [
      {
        path: '/user/anonymous0/memo',
        grant: Page.GRANT_RESTRICTED,
        grantedUsers: [testUser0],
        creator: testUser0,
      },
      {
        path: '/grant/public',
        grant: Page.GRANT_PUBLIC,
        grantedUsers: [testUser0],
        creator: testUser0,
      },
      {
        path: '/grant/restricted',
        grant: Page.GRANT_RESTRICTED,
        grantedUsers: [testUser0],
        creator: testUser0,
      },
      {
        path: '/grant/specified',
        grant: Page.GRANT_SPECIFIED,
        grantedUsers: [testUser0],
        creator: testUser0,
      },
      {
        path: '/grant/owner',
        grant: Page.GRANT_OWNER,
        grantedUsers: [testUser0],
        creator: testUser0,
      },
      {
        path: '/page/for/extended',
        grant: Page.GRANT_PUBLIC,
        creator: testUser0,
        extended: { hoge: 1 },
      },
      {
        path: '/grant/groupacl',
        grant: Page.GRANT_USER_GROUP,
        grantedUsers: [],
        grantedGroup: testGroup0,
        creator: testUser1,
      },
      {
        path: '/page1',
        grant: Page.GRANT_PUBLIC,
        creator: testUser0,
      },
      {
        path: '/page1/child1',
        grant: Page.GRANT_PUBLIC,
        creator: testUser0,
      },
      {
        path: '/page2',
        grant: Page.GRANT_PUBLIC,
        creator: testUser0,
      },
    ];
    createdPages = await testDBUtil.generateFixture(conn, 'Page', fixture);
  });

  describe('.isPublic', () => {
    context('with a public page', () => {
      it('should return true', (done) => {
        Page.findOne({ path: '/grant/public' }, (err, page) => {
          expect(err).to.be.null;
          expect(page.isPublic()).to.be.equal(true);
          done();
        });
      });
    });

    ['restricted', 'specified', 'owner'].forEach((grant) => {
      context(`with a ${grant} page`, () => {
        it('should return false', (done) => {
          Page.findOne({ path: `/grant/${grant}` }, (err, page) => {
            expect(err).to.be.null;
            expect(page.isPublic()).to.be.equal(false);
            done();
          });
        });
      });
    });
  });

  describe('.getDeletedPageName', () => {
    it('should return trash page name', () => {
      expect(Page.getDeletedPageName('/hoge')).to.be.equal('/trash/hoge');
      expect(Page.getDeletedPageName('hoge')).to.be.equal('/trash/hoge');
    });
  });
  describe('.getRevertDeletedPageName', () => {
    it('should return reverted trash page name', () => {
      expect(Page.getRevertDeletedPageName('/hoge')).to.be.equal('/hoge');
      expect(Page.getRevertDeletedPageName('/trash/hoge')).to.be.equal('/hoge');
      expect(Page.getRevertDeletedPageName('/trash/hoge/trash')).to.be.equal('/hoge/trash');
    });
  });

  describe('.isDeletableName', () => {
    it('should decide deletable or not', () => {
      expect(Page.isDeletableName('/hoge')).to.be.true;
      expect(Page.isDeletableName('/user/xxx')).to.be.false;
      expect(Page.isDeletableName('/user/xxx123')).to.be.false;
      expect(Page.isDeletableName('/user/xxx/')).to.be.true;
      expect(Page.isDeletableName('/user/xxx/hoge')).to.be.true;
    });
  });

  describe('.isCreatableName', () => {
    it('should decide creatable or not', () => {
      expect(Page.isCreatableName('/hoge')).to.be.true;

      // edge cases
      expect(Page.isCreatableName('/me')).to.be.false;
      expect(Page.isCreatableName('/me/')).to.be.false;
      expect(Page.isCreatableName('/me/x')).to.be.false;
      expect(Page.isCreatableName('/meeting')).to.be.true;
      expect(Page.isCreatableName('/meeting/x')).to.be.true;

      // end with "edit"
      expect(Page.isCreatableName('/meeting/edit')).to.be.false;

      // under score
      expect(Page.isCreatableName('/_')).to.be.true;
      expect(Page.isCreatableName('/_template')).to.be.true;
      expect(Page.isCreatableName('/__template')).to.be.true;
      expect(Page.isCreatableName('/_r/x')).to.be.false;
      expect(Page.isCreatableName('/_api')).to.be.false;
      expect(Page.isCreatableName('/_apix')).to.be.false;
      expect(Page.isCreatableName('/_api/x')).to.be.false;

      expect(Page.isCreatableName('/hoge/xx.md')).to.be.false;

      // start with https?
      expect(Page.isCreatableName('/http://demo.growi.org/hoge')).to.be.false;
      expect(Page.isCreatableName('/https://demo.growi.org/hoge')).to.be.false;
      expect(Page.isCreatableName('http://demo.growi.org/hoge')).to.be.false;
      expect(Page.isCreatableName('https://demo.growi.org/hoge')).to.be.false;

      expect(Page.isCreatableName('/ the / path / with / space')).to.be.false;

      const forbidden = ['installer', 'register', 'login', 'logout',
                         'admin', 'files', 'trash', 'paste', 'comments'];
      for (let i = 0; i < forbidden.length; i++) {
        const pn = forbidden[i];
        expect(Page.isCreatableName(`/${pn}`)).to.be.false;
        expect(Page.isCreatableName(`/${pn}/`)).to.be.false;
        expect(Page.isCreatableName(`/${pn}/abc`)).to.be.false;
      }
    });
  });

  describe('.isAccessiblePageByViewer', () => {
    context('with a granted user', () => {
      it('should return true', async() => {
        const user = await User.findOne({ email: 'anonymous0@example.com' });
        const page = await Page.findOne({ path: '/user/anonymous0/memo' });

        const bool = await Page.isAccessiblePageByViewer(page.id, user);
        expect(bool).to.be.equal(true);
      });
    });

    context('with a public page', () => {
      it('should return true', async() => {
        const user = await User.findOne({ email: 'anonymous1@example.com' });
        const page = await Page.findOne({ path: '/grant/public' });

        const bool = await Page.isAccessiblePageByViewer(page.id, user);
        expect(bool).to.be.equal(true);
      });
    });

    context('with a restricted page and an user who has no grant', () => {
      it('should return false', async() => {
        const user = await User.findOne({ email: 'anonymous1@example.com' });
        const page = await Page.findOne({ path: '/grant/owner' });

        const bool = await Page.isAccessiblePageByViewer(page.id, user);
        expect(bool).to.be.equal(false);
      });
    });
  });

  describe('Extended field', () => {
    context('Slack Channel.', () => {
      it('should be empty', (done) => {
        Page.findOne({ path: '/page/for/extended' }, (err, page) => {
          expect(page.extended.hoge).to.be.equal(1);
          expect(page.getSlackChannel()).to.be.equal('');
          done();
        });
      });

      it('set slack channel and should get it and should keep hoge ', async() => {
        let page = await Page.findOne({ path: '/page/for/extended' });
        await page.updateSlackChannel('slack-channel1');
        page = await Page.findOne({ path: '/page/for/extended' });
        expect(page.extended.hoge).to.be.equal(1);
        expect(page.getSlackChannel()).to.be.equal('slack-channel1');
      });
    });
  });

  describe('.findPage', () => {
    context('findByIdAndViewer', () => {
      it('should find page (public)', async() => {
        const pageToFind = createdPages[1];
        const grantedUser = createdUsers[0];

        const page = await Page.findByIdAndViewer(pageToFind.id, grantedUser);
        expect(page).to.be.not.null;
        expect(page.path).to.equal(pageToFind.path);
      });

      it('should find page (anyone knows link)', async() => {
        const pageToFind = createdPages[2];
        const grantedUser = createdUsers[1];

        const page = await Page.findByIdAndViewer(pageToFind.id, grantedUser);
        expect(page).to.be.not.null;
        expect(page.path).to.equal(pageToFind.path);
      });

      it('should find page (just me)', async() => {
        const pageToFind = createdPages[4];
        const grantedUser = createdUsers[0];

        const page = await Page.findByIdAndViewer(pageToFind.id, grantedUser);
        expect(page).to.be.not.null;
        expect(page.path).to.equal(pageToFind.path);
      });

      it('should not be found by grant (just me)', async() => {
        const pageToFind = createdPages[4];
        const grantedUser = createdUsers[1];

        const page = await Page.findByIdAndViewer(pageToFind.id, grantedUser);
        expect(page).to.be.null;
      });
    });

    context('findByIdAndViewer granted userGroup', () => {
      it('should find page', async() => {
        const pageToFind = createdPages[6];
        const grantedUser = createdUsers[0];

        const page = await Page.findByIdAndViewer(pageToFind.id, grantedUser);
        expect(page).to.be.not.null;
        expect(page.path).to.equal(pageToFind.path);
      });

      it('should not be found by grant', async() => {
        const pageToFind = createdPages[6];
        const grantedUser = createdUsers[2];

        const page = await Page.findByIdAndViewer(pageToFind.id, grantedUser);
        expect(page).to.be.null;
      });
    });
  });

  context('findListWithDescendants', () => {
    it('should return only /page/', async() => {
      const user = createdUsers[0];

      const result = await Page.findListWithDescendants('/page/', user, { isRegExpEscapedFromPath: true });

      // assert totalCount
      expect(result.totalCount).to.equal(1);
      // assert paths
      const pagePaths = result.pages.map((page) => { return page.path });
      expect(pagePaths).to.include.members(['/page/for/extended']);
    });
    it('should return only /page1/', async() => {
      const user = createdUsers[0];

      const result = await Page.findListWithDescendants('/page1/', user, { isRegExpEscapedFromPath: true });

      // assert totalCount
      expect(result.totalCount).to.equal(2);
      // assert paths
      const pagePaths = result.pages.map((page) => { return page.path });
      expect(pagePaths).to.include.members(['/page1', '/page1/child1']);
    });
  });

  context('findListByStartWith', () => {
    it('should return pages which starts with /page', async() => {
      const user = createdUsers[0];

      const result = await Page.findListByStartWith('/page', user, {});

      // assert totalCount
      expect(result.totalCount).to.equal(4);
      // assert paths
      const pagePaths = result.pages.map((page) => { return page.path });
      expect(pagePaths).to.include.members(['/page/for/extended', '/page1', '/page1/child1', '/page2']);
    });
    it('should process with regexp', async() => {
      const user = createdUsers[0];

      const result = await Page.findListByStartWith('/page\\d{1}/', user, {});

      // assert totalCount
      expect(result.totalCount).to.equal(3);
      // assert paths
      const pagePaths = result.pages.map((page) => { return page.path });
      expect(pagePaths).to.include.members(['/page1', '/page1/child1', '/page2']);
    });
  });
});
